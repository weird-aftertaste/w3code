# T3 Code ↔ OMP Bridge

A **standalone npm package** that starts [Oh My Pi (OMP)](https://github.com/can1357/oh-my-pi) through T3 Code's existing **Pi** provider. **No T3 Code fork or build is required.**

> **Experimental:** the bridge has mock-RPC tests, but end-to-end operation with your OMP CLI, tool approvals, MCP and native session resume is not fully verified. Use a disposable workspace and avoid Full access until permissions have been verified.

## One-command installation

The package is **prepared for the public npm registry, but not published there yet**. Until the first npm release, install the package directly from its *small standalone Git branch*:

```sh
npm install -g "github:weird-aftertaste/w3code#omp-bridge-standalone"
```

**This does not require manually cloning or building the T3 Code repository.** npm may use Git internally to resolve the GitHub source; Git must be installed for that command. The selected branch's root tree contains only the bridge files, not the T3 Code monorepo.

Alternatively, using the GitHub branch source archive (no separate git clone command):

```sh
npm install -g "https://github.com/weird-aftertaste/w3code/archive/refs/heads/omp-bridge-standalone.tar.gz"
```

Once the package is **actually published** on npmjs.com, the intended shorter command is:

```sh
npm install -g t3code-omp-bridge
```

Do **not** assume the short npm registry command works before the initial publication.

**Prerequisites:** Node.js 20+, npm, and a working authenticated OMP CLI on **the same host or container where the T3 Code server runs**. In particular, `omp --version` must work as the T3 server user. For Windows, a native `omp.exe` is preferable; spawning npm `.cmd` shims from Node can fail.

Verify after installation:

```sh
omp --version
omp-t3-bridge --version
```

In Windows PowerShell use `omp-t3-bridge.cmd --version` if necessary.

## Configure T3 Code

In **Settings → Providers**, create a *second Pi instance*; keep the original Pi instance unchanged:

- **Display name:** `Oh My Pi`
- **Binary path:** `omp-t3-bridge` (on Windows, use `omp-t3-bridge.cmd` or its absolute path if not resolved)
- **Launch arguments:** leave empty
- **Enabled:** yes

Then refresh providers. If OMP is not on the service's PATH, set the provider environment variable `OMP_REAL_BINARY` to the absolute path of a **native executable**. The bridge inherits regular provider environment variables for model credentials.

**Existing OMP session history is not imported** by this standalone bridge on official T3 Code. It handles new Pi-backed OMP RPC sessions only; the separate T3 fork's importer is not needed for the bridge and is not included here.

## Updating

Before npm publication, update the GitHub install using the same command:

```sh
npm install -g "github:weird-aftertaste/w3code#omp-bridge-standalone"
```

Once published in the registry, `npm update -g t3code-omp-bridge` can be used.

## Development and publishing

The root of the `omp-bridge-standalone` branch is a publishable npm package: it has `package.json`, an executable `bin` entry, an MIT license, test suite and a clean package allowlist. No runtime dependencies or build step are needed.

For a maintainer with npm publishing rights:

```sh
npm test
npm pack --dry-run
npm login
npm publish --access public
```

The package name `t3code-omp-bridge` must be available in the npm registry and the publisher must have permission to publish it. **Nothing has been published automatically.** Future publish automation can use npm's trusted publisher support.

## Implementation

- Launch OMP in RPC mode while forwarding Pi's normal CLI arguments.
- Translate Pi `--session` to OMP `--resume`.
- Translate Pi `get_commands` to OMP `get_available_commands`.
- Translate `session_settled` to `agent_settled`.
- Negotiate RPC v2 and reassemble chunked messages.
- Forward text CLI health checks such as `--version`.
- Leave the existing T3 Code source and interface unchanged.

This standalone branch must **not** be merged into T3 Code's `main`. Detailed installation-agent instructions are in [AGENTS.md](./AGENTS.md).
