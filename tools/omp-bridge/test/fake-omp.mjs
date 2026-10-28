#!/usr/bin/env node
import { createInterface } from 'node:readline';
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('v18.13.2');
  process.exit(0);
}
process.stdout.write(JSON.stringify({ type: 'ready', supportedProtocolVersions: [1, 2] }) + '\n');
function emit(frame) { process.stdout.write(JSON.stringify(frame) + '\n'); }
for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  const cmd = JSON.parse(line);
  if (cmd.type === 'negotiate_protocol') {
    emit({ type: 'response', command: 'negotiate_protocol', id: cmd.id, success: true });
  } else if (cmd.type === 'get_available_commands') {
    emit({ type: 'response', command: cmd.type, id: cmd.id, success: true,
      data: { commands: [{ name: 'omp-special', description: 'A test slash command' }] } });
  } else if (cmd.type === 'get_state') {
    emit({ type: 'response', command: cmd.type, id: cmd.id, success: true, data: { args } });
  } else if (cmd.type === 'prompt') {
    emit({ type: 'response', command: cmd.type, id: cmd.id, success: true, data: {} });
    emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'hello' } });
    emit({ type: 'prompt_result', id: cmd.id, status: 'completed', sessionSettled: true });
    emit({ type: 'session_settled' });
  } else if (cmd.type === 'big') {
    const payload = JSON.stringify({ type: 'response', id: cmd.id, success: true, data: { huge: 'A'.repeat(250000) } });
    const bytes = Buffer.from(payload);
    const pieces = [];
    for (let i = 0; i < bytes.length; i += 8192) pieces.push(bytes.subarray(i, i + 8192));
    pieces.forEach((part, index) => emit({ type: 'rpc_chunk', chunkId: 'big-response', count: pieces.length, index,
      byteLength: bytes.length, data: part.toString('base64') }));
  }
}
