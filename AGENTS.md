# Instructions for an installation agent

The user wants to install this **experimental OMP RPC bridge** on the host running their T3 Code server, without rebuilding or modifying T3 Code.

1. Verify whether this host runs the T3 Code server. If it is a remote/client-only machine, locate the server host first.
2. Check prerequisites: `node --version` (>= 20), `npm --version`, `git --version`, `omp --version`. Do not replace a working installation without justification.
3. Install the package from this repository as documented in README.md: `npm install -g .` from the cloned root. You may use a user-level npm prefix if global permissions prohibit writing to the system prefix.
4. Verify the bridge version pass-through: `omp-t3-bridge --version` on Linux/macOS or `omp-t3-bridge.cmd --version` on Windows. Exit code must be zero and version should match `omp --version`.
5. Run `npm test`. These are mocked tests; don't treat them as proof of end-to-end compatibility.
6. Configure a *new, additional Pi provider instance* named `Oh My Pi` in T3 Code: binary path `omp-t3-bridge` (or absolute path); empty launch args; enabled. **Never replace or remove the existing Pi provider.**
7. For any T3 Code process started as a service/container, make sure the installed bridge, Node.js and OMP executables are visible **inside the same service/container execution environment**, with the appropriate PATH and credentials. Restart only the relevant service if necessary.
8. Refresh provider status. If it fails, collect errors without revealing secrets. Check `OMP_REAL_BINARY` if the OMP binary isn't found. On Windows favor a native `omp.exe`, since Node.js spawn of npm `.cmd` shims may fail.
9. Do not use Full access, disable approvals, or modify production project files until permissions, MCP and tool use have been validated. Start with a disposable project and a read-only prompt.
10. Report to the user what was installed, version checks, npm test results, provider status, remaining blockers, and any modifications made.

This is an optional compatibility shim. No upstream T3 Code source modification is required. Do not merge this standalone Git branch into `main`; its root tree deliberately excludes the T3 Code source.
