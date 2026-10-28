# Installation instructions for a server agent

Goal: install the **standalone experimental OMP bridge** on the machine or container where the user's **official T3 Code server** runs. Do not fork or build T3 Code. Do not touch old OMP sessions or change the normal Pi provider.

1. Check `node --version` (Node >=20), `npm --version` and `omp --version`. Confirm OMP is authenticated for the service user; don't reveal credentials.
2. Install directly without cloning a repository manually:
   `npm install -g "github:weird-aftertaste/w3code#omp-bridge-standalone"`.
   This GitHub branch is a small package-only tree. If npm needs Git, install Git as a prerequisite. Alternatively use the archive URL in README.md.
3. Check the installed executable: `omp-t3-bridge --version` (PowerShell: `omp-t3-bridge.cmd --version`). Ensure it agrees with `omp --version` and exits 0.
4. In T3 Code → Settings → Providers, add another **Pi** instance: display name `Oh My Pi`, binary path `omp-t3-bridge` (or full executable path), no extra launch args, enabled. Preserve normal Pi.
5. If the app runs inside Docker/systemd/another user, validate PATH and executable/credential visibility **within the running T3 server environment**. Don't install on the client device by accident.
6. Refresh provider status. If it fails, inspect stderr and paths, and set `OMP_REAL_BINARY` to the native OMP binary location if needed.
7. Safety: the bridge alone does not enforce permissions. Use a disposable project and a read-only test first. Do not enable Full access until approvals and MCP are verified. Existing CLI sessions are not auto-imported.
8. Report installation commands, versions, provider status, issues and any changes to the machine. Do not claim success without an end-to-end OMP test.

The short registry command `npm install -g t3code-omp-bridge` will only work after the package has actually been published to npmjs.com.
