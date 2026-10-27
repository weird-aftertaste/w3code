# OMP ↔ T3 Code bridge

A standalone compatibility bridge allowing **Oh My Pi (OMP)** to run as a second **Pi** provider instance in upstream [T3 Code](https://github.com/pingdotgg/t3code). There is no need to patch, build, or fork T3 Code to install this package.

**Status: experimental.** RPC parsing and `--version` handling have mock tests. The full integration (permissions, MCP, sessions, rollback and Windows process handling) has **not** been end-to-end validated. Test in a disposable workspace, and do not enable Full access until permission handling is verified.

## Install on the server where T3 Code runs

Requires **Node.js 20+**, npm, Git and an installed/authenticated OMP CLI. On Linux/macOS:

```bash
node --version
omp --version
git clone --depth 1 --single-branch --branch omp-bridge-standalone https://github.com/weird-aftertaste/w3code.git t3code-omp-bridge
cd t3code-omp-bridge
npm install -g .
omp-t3-bridge --version
npm test
```

The clone is intentionally shallow and contains only this package, **not** the whole T3 Code monorepo. If `npm install -g` fails with EACCES, use a correctly configured user-level npm global prefix instead of blindly running sudo. Restart the T3 Code server process when PATH changes.

On Windows PowerShell (OMP should preferably be a native `omp.exe`):

```powershell
git clone --depth 1 --single-branch --branch omp-bridge-standalone https://github.com/weird-aftertaste/w3code.git t3code-omp-bridge
cd t3code-omp-bridge
npm install -g .
omp-t3-bridge.cmd --version
npm test
```

## Configure T3 Code

In **Settings → Providers**, create an *additional Pi instance*:

- **Display name:** `Oh My Pi`
- **Binary path:** `omp-t3-bridge` (or the full path; on Windows, use `omp-t3-bridge.cmd` when necessary)
- **Launch arguments:** empty
- **Enabled:** yes

Refresh providers. This remains a separately named **Pi** instance, not a native `omp` driver.

If the bridge cannot find OMP, set the instance environment variable `OMP_REAL_BINARY` to the absolute path of the native `omp` executable. For Windows, avoid pointing it to an npm `.cmd` shim unless you have verified it works.

## Update

In the installation folder:

```bash
git pull --ff-only origin omp-bridge-standalone
npm install -g .
```

## How it works

- Runs installed `omp --mode rpc` with arguments supplied by T3 Code.
- Translates Pi `--session` to OMP `--resume`.
- Translates `get_commands` to `get_available_commands`.
- Converts OMP `session_settled` to Pi `agent_settled`.
- Negotiates RPC protocol v2, reassembles chunked output and passes CLI health-check output through unchanged.
- Passes other RPC events and messages without changing T3 Code.

For tests: `npm test`. These tests use a fake OMP executable, not real credentials. See [AGENTS.md](./AGENTS.md) for installation-agent instructions.

Source of this package is also maintained at `tools/omp-bridge/` on the `feature/omp` branch of [weird-aftertaste/w3code](https://github.com/weird-aftertaste/w3code/tree/feature/omp/tools/omp-bridge). This standalone branch intentionally contains only the bridge and must **not** be merged into T3 Code's `main`.
