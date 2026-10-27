#!/usr/bin/env node
/**
 * OMP -> T3 Code Pi RPC compatibility bridge.
 *
 * Keep this shim independent of T3 internals: configure it as the binaryPath
 * of an additional Pi instance named "Oh My Pi". It owns no API credentials.
 */
import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { TextDecoder } from 'node:util';

const NEGOTIATE_ID = '__t3code_omp_bridge_protocol_v2__';
const MAX_REASSEMBLED_BYTES = 64 * 1024 * 1024;
const MAX_BUFFER_CHARS = MAX_REASSEMBLED_BYTES * 2;
const BINARY = process.env.OMP_REAL_BINARY || 'omp';

function adaptArguments(args) {
  const output = [];
  for (let i = 0; i < args.length; i += 1) {
    // Pi --session points at a JSONL file; OMP's resume flag serves that role.
    if (args[i] === '--session') {
      output.push('--resume');
    } else {
      output.push(args[i]);
    }
  }
  return output;
}

const child = spawn(BINARY, adaptArguments(process.argv.slice(2)), {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['pipe', 'pipe', 'inherit'],
  windowsHide: true,
});

let exited = false;
let promptStatus = 'completed';
let chunkFrame = null;
let stdoutBuffer = '';
let stdinBuffer = '';
const stdinDecoder = new StringDecoder('utf8');
const stdoutDecoder = new StringDecoder('utf8');

function shutdown(reason) {
  if (exited) return;
  exited = true;
  console.error(`OMP bridge: ${reason}`);
  if (child.pid) child.kill('SIGTERM');
  process.exitCode = 1;
  process.stdin.pause();
  process.stdout.end();
}

function sendToClient(frame) {
  if (!process.stdout.destroyed) process.stdout.write(`${JSON.stringify(frame)}\n`);
}

function sendToOmp(frame) {
  if (!child.stdin.destroyed) child.stdin.write(`${JSON.stringify(frame)}\n`);
}

function translate(frame) {
  if (frame.type === 'prompt_result') {
    promptStatus = frame.status === 'aborted' ? 'aborted' : 'completed';
  }
  if (frame.type === 'session_settled') {
    // T3 Pi waits for agent_settled before completing its turn.
    return { ...frame, type: 'agent_settled', aborted: promptStatus === 'aborted' };
  }
  return frame;
}

function handleFrame(frame) {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return;
  if (frame.type === 'response' && frame.id === NEGOTIATE_ID) return;
  if (frame.type !== 'rpc_chunk') {
    if (chunkFrame !== null) return shutdown('interrupted RPC chunk sequence');
    return sendToClient(translate(frame));
  }
  const { chunkId, index, count, byteLength, data } = frame;
  if (
    typeof chunkId !== 'string' || !Number.isSafeInteger(index) ||
    !Number.isSafeInteger(count) || count < 1 || count > 10000 ||
    !Number.isSafeInteger(byteLength) || byteLength < 1 ||
    byteLength > MAX_REASSEMBLED_BYTES || typeof data !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)
  ) return shutdown('invalid RPC chunk metadata');
  if (chunkFrame === null) {
    if (index !== 0) return shutdown('RPC chunks did not begin at index zero');
    chunkFrame = { chunkId, count, byteLength, parts: [], size: 0 };
  }
  if (
    chunkFrame.chunkId !== chunkId || chunkFrame.count !== count ||
    chunkFrame.byteLength !== byteLength || chunkFrame.parts.length !== index
  ) return shutdown('out-of-order RPC chunk');
  const part = Buffer.from(data, 'base64');
  chunkFrame.size += part.length;
  if (chunkFrame.size > byteLength) return shutdown('RPC chunk length exceeded');
  chunkFrame.parts.push(part);
  if (index !== count - 1) return;
  if (chunkFrame.size !== byteLength) return shutdown('RPC chunk length mismatch');
  const assembled = Buffer.concat(chunkFrame.parts, byteLength);
  chunkFrame = null;
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(assembled);
    handleFrame(JSON.parse(decoded));
  } catch (error) {
    shutdown(`could not decode RPC chunks: ${error.message}`);
  }
}

function processStdoutLine(line) {
  if (!line) return;
  try {
    handleFrame(JSON.parse(line.endsWith('\r') ? line.slice(0, -1) : line));
  } catch (error) {
    shutdown(`invalid OMP JSONL output: ${error.message}`);
  }
}
function processStdinLine(line) {
  if (!line) return;
  try {
    const frame = JSON.parse(line.endsWith('\r') ? line.slice(0, -1) : line);
    // Pi names this command differently from the newer OMP RPC protocol.
    if (frame && frame.type === 'get_commands') frame.type = 'get_available_commands';
    sendToOmp(frame);
  } catch (error) {
    // Forward malformed lines for the native RPC server to reject.
    if (!child.stdin.destroyed) child.stdin.write(line + '\n');
  }
}
function consume(decoder, current, data, callback) {
  current += decoder.write(data);
  if (current.length > MAX_BUFFER_CHARS) throw new Error('unbounded JSONL frame');
  const lines = current.split('\n');
  for (const line of lines.slice(0, -1)) callback(line);
  return lines.at(-1);
}

child.on('error', error => shutdown(`cannot start '${BINARY}': ${error.message}`));
child.on('exit', (code, signal) => {
  exited = true;
  process.exitCode = code ?? (signal ? 1 : 0);
  // Do not keep the compatibility process alive after its CLI child exits.
  process.stdin.pause();
});
child.stdout.on('data', data => {
  try { stdoutBuffer = consume(stdoutDecoder, stdoutBuffer, data, processStdoutLine); }
  catch (error) { shutdown(error.message); }
});
child.stdout.on('end', () => {
  stdoutBuffer += stdoutDecoder.end();
  if (stdoutBuffer.trim()) processStdoutLine(stdoutBuffer);
});
child.stdin.on('error', error => {
  if (error.code !== 'EPIPE') shutdown(`OMP stdin: ${error.message}`);
});
process.stdin.on('data', data => {
  try { stdinBuffer = consume(stdinDecoder, stdinBuffer, data, processStdinLine); }
  catch (error) { shutdown(error.message); }
});
process.stdin.on('end', () => {
  stdinBuffer += stdinDecoder.end();
  if (stdinBuffer.trim()) processStdinLine(stdinBuffer);
  child.stdin.end();
});
process.on('SIGINT', () => { if (child.pid) child.kill('SIGINT'); });
process.on('SIGTERM', () => { if (child.pid) child.kill('SIGTERM'); });

// Opt into OMP's lossless chunked output before regular T3 RPC commands.
sendToOmp({ id: NEGOTIATE_ID, type: 'negotiate_protocol', protocolVersion: 2 });
