# OMP RPC bridge for T3 Code

A **small, external compatibility shim**, not a replacement for T3 Code and **not yet a native `omp` driver**. T3 Code already supports several Pi provider instances. Create a second Pi instance called **Oh My Pi** and point its binary path at this bridge. The existing Pi implementation, frontend, mobile app and normal T3 Code updates remain untouched.

The shim is based on the public OMP RPC protocol (see `can1357/oh-my-pi/docs/rpc.md`) and T3 Code's `packages/provider-pi` implementation. The bridge:

- launches installed `omp --mode rpc` using T3's normal CLI arguments;
- maps Pi's `--session <file>` to OMP's `--resume <file>`;
- maps Pi `get_commands` to OMP `get_available_commands`;
- maps OMP `session_settled` to the Pi `agent_settled` completion event;
- negotiates OMP RPC protocol v2 and reassembles lossless `rpc_chunk` responses;
- forwards other JSONL commands, events and streamed output unchanged.

OMP's modern RPC also implements `fork`, so we deliberately **do not translate it to `branch`**; these operations have distinct semantics. We avoid modifying T3's existing Pi adapter (~3300 lines).

## Prerequisites

- Node.js 20+
- T3 Code version with the built-in **Pi** provider and multiple provider instances
- A working, authenticated OMP CLI (`omp --version`, launch `omp` and log in if necessary)

## Install

From the root of a T3 Code checkout (after applying the patch):

```sh
npm install -g ./tools/omp-bridge
```

This installs the `omp-t3-bridge` executable via npm, including a Windows `.cmd` launcher.

Then in **T3 Code → Settings → Providers**, create an **additional Pi instance** (do not replace the normal one):

- Display name: `Oh My Pi`
- Binary path: `omp-t3-bridge` (or the full path to the installed executable)
- Launch arguments: leave empty at first
- Enabled: yes

Refresh providers. OMP models should be discovered from the CLI. Run a harmless test in a disposable repository before using write tools.

If the real OMP executable is not on `PATH`, supply its absolute path to the **bridge process** via a provider-instance environment variable named `OMP_REAL_BINARY`. The bridge also inherits the normal environment for credentials.

### Updating with upstream

Keep the entire change inside `tools/omp-bridge/`. After setting `upstream` to `https://github.com/pingdotgg/t3code.git`:

```sh
git fetch upstream
git rebase upstream/main
```

There are no changes to T3 Code source files in this first prototype, so rebasing normally requires no code conflicts.

## Important limitations

This prototype has **mock RPC integration tests only**; it has **not** been end-to-end validated with actual OMP and T3 Code binaries in the current environment. MCP tool injection, interactive approvals, workspace tool permissions, conversation rollback, forking, special OMP extensions and model availability still need real-device testing. Do **not** enable full-access mode or rely on automatic approvals until permission enforcement is verified. The bridge does not itself perform access control.

There is also no OMP-specific icon or driver kind: the UI shows a separately named **Pi instance** rather than a native `omp` provider. A dedicated native driver can be built later if this prototype confirms RPC compatibility.

## Tests

```sh
cd tools/omp-bridge
npm test
```

Tests use a fake OMP process and require no real API credentials.
