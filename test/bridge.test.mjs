import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const dir = dirname(fileURLToPath(import.meta.url));
const shim = resolve(dir, '../bin/omp-t3-bridge.mjs');
const fakeOmp = resolve(dir, './fake-omp.mjs');

function harness() {
  const proc = spawn(process.execPath, [shim, fakeOmp, '--mode', 'rpc', '--session', '/tmp/old-pi-session.jsonl'], {
    // Use node as the fake executable so tests run on Windows without Unix shebang execution.
    env: { ...process.env, OMP_REAL_BINARY: process.execPath }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const messages = [];
  const waiters = [];
  const stderr = [];
  proc.stderr.on('data', d => stderr.push(String(d)));
  const rl = createInterface({ input: proc.stdout });
  rl.on('line', line => {
    const item = JSON.parse(line);
    messages.push(item);
    waiters.splice(0).forEach(fn => fn());
  });
  const send = x => proc.stdin.write(JSON.stringify(x) + '\n');
  const get = async predicate => {
    for (let n = 0; n < 30; n += 1) {
      const found = messages.find(predicate);
      if (found) return found;
      await Promise.race([
        new Promise(resolve => waiters.push(resolve)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RPC response timeout: '+stderr.join(''))), 350)),
      ]);
    }
    throw new Error('unreachable');
  };
  return { proc, messages, send, get };
}

test('rewrites resume arg; Pi command lookup; normalizes settled event', async t => {
  const h = harness();
  t.after(() => h.proc.kill('SIGKILL'));
  await h.get(m => m.type === 'ready');
  h.send({ id: 'state', type: 'get_state' });
  const state = await h.get(m => m.id === 'state');
  assert.deepEqual(state.data.args, ['--mode', 'rpc', '--resume', '/tmp/old-pi-session.jsonl']);
  h.send({ id: 'cmd', type: 'get_commands' });
  assert.equal((await h.get(m => m.id === 'cmd')).data.commands[0].name, 'omp-special');
  h.send({ id: 'ask', type: 'prompt', message: 'hi' });
  assert.equal((await h.get(m => m.type === 'agent_settled')).aborted, false);
  assert.equal(h.messages.some(m => m.type === 'session_settled'), false);
  assert.equal(h.messages.some(m => m.id === '__t3code_omp_bridge_protocol_v2__'), false);
});

test('reassembles OMP protocol v2 rpc_chunk frames into one JSONL result', async t => {
  const h = harness();
  t.after(() => h.proc.kill('SIGKILL'));
  await h.get(m => m.type === 'ready');
  h.send({ id: 'huge', type: 'big' });
  const result = await h.get(m => m.id === 'huge');
  assert.equal(result.data.huge.length, 250000);
  assert.equal(h.messages.some(m => m.type === 'rpc_chunk'), false);
});


test('passes plain-text --version output and exit code through to T3 health check', async () => {
  const proc = spawn(process.execPath, [shim, fakeOmp, '--version'], {
    env: { ...process.env, OMP_REAL_BINARY: process.execPath }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  const errs = [];
  proc.stdout.on('data', data => chunks.push(data));
  proc.stderr.on('data', data => errs.push(data));
  const exitCode = await new Promise((resolve, reject) => {
    proc.once('error', reject);
    proc.once('exit', resolve);
  });
  assert.equal(exitCode, 0, Buffer.concat(errs).toString());
  assert.equal(Buffer.concat(chunks).toString().trim(), 'v18.13.2');
});
