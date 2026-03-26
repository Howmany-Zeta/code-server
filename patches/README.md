# VS Code patches (auth-docen ↔ `vscode-main`)

This directory holds **reference diffs** aligned with OpenSpec change **`vscode-main-auth-docen-core-patches`** (`openspec/changes/vscode-main-auth-docen-core-patches/`). The **source of truth** for behavior is the **`vscode-main`** fork in this monorepo (commits), not applying these files on every build.

## Scope

| Patch file | Intent (code-server lineage) | Status in `vscode-main` |
|------------|------------------------------|-------------------------|
| `integration.diff` | Server bootstrap, dynamic `server-main`, env filtering | Merged / maintained as fork commits |
| `base-path.diff` | Path-prefix proxy, remote authority URLs | Merged |
| `webview.diff` | Webview same-origin / base path | Merged |
| `marketplace.diff` | Gallery / product alignment (coordinate with `ci/build/build-vscode.sh` `product.json`) | Merged |
| `logout.diff` | `logoutEndpoint`, logout command | Merged |
| `proxy-uri.diff` | `VSCODE_PROXY_URI`, `asExternalUri`, port forwarding integration | Merged |
| `unique-db.diff` | IndexedDB workspace key isolation | **Superseded by fork callback** (see below) |
| `local-storage.diff` | `userDataPath` in web client for remote user settings | **Superseded by fork callback** (see below) |
| `clipboard.diff` | `_remoteCLI.setClipboard`, CLI pipe | Merged |
| `display-language.diff` | Remote language packs / server-web locale | Merged |
| `trusted-domains.diff` | `link-protection-trusted-domains` server arg + web | Merged |

## Fork-only adjustments (callbacks / 自洽)

These reduce drift from upstream Microsoft VS Code and avoid affecting **generic Web embedders** or **desktop Remote SSH** where the original patch stack was overly broad.

1. **IndexedDB workspace storage (`unique-db` lineage)**  
   Pathname hash is **not** always appended. It applies only if `embedderIdentifier === 'server-distro'` **or** product flag `pathnameWorkspaceIndexedDBIsolation === true`. Otherwise workspace DB id matches upstream (no pathname suffix).  
   *Rationale:* Same-origin multi-path isolation for server-web without changing all browser `storageService` consumers.

2. **Forwarded Ports UI (`remoteExplorer`)**  
   Restored upstream **context keys** (`forwardedPortsFeaturesEnabled` / `forwardedPortsViewEnabled`). **Additional** full enablement when `remoteAuthority` **and** (`proxyEndpointTemplate` **or** `embedderIdentifier === 'server-distro'`).  
   *Rationale:* Avoid forcing port UI for every Remote session (e.g. desktop SSH).

3. **Web bootstrap (`code/browser/workbench/workbench.ts`)**  
   `resolveExternalUri` and stub `tunnelProvider` are registered **only** when `proxyEndpointTemplate` is set (from injected `productConfiguration` or default `product`). No throw when template is absent; upstream defaults apply.

4. **`BrowserWorkbenchEnvironmentService` (`userDataPath`)**  
   Strict require + remote `vscode-remote` user home layout applies only for **server-injected** scenarios: `remoteAuthority` **and** (`proxyEndpointTemplate` **or** `embedderIdentifier === 'server-distro'`). Other Web builds use upstream **`vscode-userdata`** virtual path (`/User`) and do not throw on missing `userDataPath`.

5. **Web locale service entry**  
   `workbench.web.main.ts` imports `services/localization/browser/localeService.web.ts`, which re-exports the shared implementation—avoids implying an Electron-only path in Web bundles.

6. **Type / product surface**  
   Optional `IProductConfiguration` fields (`logoutEndpoint`, `proxyEndpointTemplate`, etc.) are harmless on desktop when unset; values are normally injected by the server for Web.

7. **`RemoteAuthorityResolverService`**  
   Sets `VSCODE_PROXY_URI` in extension host env **only** when `proxyEndpointTemplate` is present (feature gate).

8. **Other merged behaviors (no extra embedder gate)**  
   CLI clipboard bridge (`_remoteCLI.setClipboard`), `terminalEnvironment` handling of `VSCODE_PROXY_URI`, and **CodeServerClient** logout registration **only when `logoutEndpoint` is set**—consistent with Remote / server-web; stricter `server-distro` on logout is optional polish, not required.

## Removed patch files (not part of core merge)

The following were **deleted** from this folder; they were optional, policy, or build-only in the code-server stack and are **out of scope** for `vscode-main-auth-docen-core-patches` unless a future change reintroduces them:

- `proposed-api.diff`, `telemetry.diff`, `signature-verification.diff`
- `disable-builtin-ext-update.diff`, `insecure-notification.diff`, `update-check.diff`
- `store-socket.diff`, `service-worker.diff`, `sourcemaps.diff`
- `external-file-actions.diff`, `cli-window-open.diff`, `getting-started.diff`, `keepalive.diff`
- `fix-build.diff` (evaluate only if a full REH-Web build fails)

## Maintenance when upgrading VS Code

1. Rebase `vscode-main` onto the target upstream tag.  
2. Use the retained `*.diff` files as **line-level hints**; resolve conflicts in the fork first.  
3. Re-read `openspec/changes/vscode-main-auth-docen-core-patches/design.md` and **this README** for callback rules so new upstream code does not reintroduce global Web behavior.  
4. Align `auth-docen/ci/build/build-vscode.sh` `product.json` merges with `product.ts` / gallery URLs.

## Quilt / CI

`series` lists only the retained patches. Workflows that run `quilt push -a` should apply this stack; if the fork already contains the changes, applying patches may be redundant or conflict—prefer building from **`vscode-main`** for this monorepo.
