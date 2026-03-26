# Linking `lib/vscode` to monorepo `vscode-main`

## Symlink (this repo / Startu layout)

From the `auth-docen` root:

```bash
mkdir -p lib
# Target is repo-root vscode-main (lib/ is auth-docen/lib/)
ln -sfn ../../vscode-main lib/vscode
```

Expected layout:

```text
startu/
  auth-docen/
    lib/vscode -> ../../vscode-main
  vscode-main/   # customized VS Code
```

## What auth-docen loads at runtime

`src/node/constants.ts` sets `vsRootPath = <auth-docen>/lib/vscode`.

`src/node/routes/vscode.ts` loads the server with:

```text
<vsRootPath>/out/server-main.js
```

So **`vscode-main` must be compiled until `out/server-main.js` exists** (same as upstream VS Code OSS `gulp compile` output under `out/`).

## Builds in `vscode-main` (Startu fork)

| Goal | Command (from `vscode-main/`) | Relevant output |
|------|------------------------------|-----------------|
| Day-to-day server + extensions | `npm run compile` → `gulp compile` | `out/` including **`out/server-main.js`** only — **not** enough for browser workbench assets (see below) |
| Server product merge then compile | `npm run compile:server` | `merge-product-server --server` then `gulp compile` → **`out/server-main.js`** (same partial `out/` caveat) |
| **Browser workbench (auth-docen in the browser)** | `npm run gulp vscode-reh-web-linux-x64` or `-min` | Packaged tree **`vscode-reh-web-linux-x64/`** at the **monorepo root** (`startu/vscode-reh-web-linux-x64/`) — gulp uses `BUILD_ROOT = dirname(vscode repo)`, not inside `vscode-main/`. It contains a **complete `out/`** (NLS, bundled workbench CSS/JS). Point `lib/vscode` at this directory. |

Plain `npm run compile` does **not** emit `out/nls.messages.js`, `out/vs/code/browser/workbench/workbench.css`, and other REH-Web bundle artifacts. If you symlink `lib/vscode` to the repo root after only `compile`, the UI can show **404** on those files and **MIME type `text/css` / module script** errors.

**Recommended for auth-docen (browser):** after the gulp task finishes, from `auth-docen/`:

```bash
chmod +x scripts/link-vscode-reh-web.sh
./scripts/link-vscode-reh-web.sh
```

That repoints `lib/vscode` → `../vscode-main/vscode-reh-web-linux-x64`. Restart auth-docen.

Always confirm:

```bash
# After plain compile (symlink to repo root):
test -f out/server-main.js && echo OK
# After REH-Web package (paths are under monorepo root, not vscode-main/):
test -f ../vscode-reh-web-linux-x64/out/server-main.js && test -f ../vscode-reh-web-linux-x64/out/nls.messages.js && echo OK
```

### Troubleshooting: 404 `nls.messages.js`, `workbench.css`, CSS “module script” errors

1. **Incomplete `out/`** — Run `npm run gulp vscode-reh-web-linux-x64` (or `-min`) in `vscode-main`, then `./scripts/link-vscode-reh-web.sh`.
2. **`VSCODE_DEV`** — If set, the server may serve `workbench-dev.html` and asset paths won’t match a packaged `out/`. **Unset** before starting auth-docen: `unset VSCODE_DEV`.

### OpenSpec §6 verification (REH-Web build output)

After `npm run gulp vscode-reh-web-linux-x64-min` (or non-`-min`), the fork emits **`vscode-main/out-vscode-reh-web-min/`** with at least:

- `nls.messages.js`
- `server-main.js` (also produced under `out/` via the same gulp chain)
- `vs/code/browser/workbench/workbench.css` (and other bundled workbench assets)

Some setups also produce **`vscode-main/vscode-reh-web-linux-x64/`** with a full `out/`; either layout is valid if the browser can load NLS and workbench CSS.

**Manual smoke (§6.2):** run auth-docen with `unset VSCODE_DEV`, JWT or password auth, and verify login → workbench → logout (if `logoutEndpoint` is set) → `/proxy/<port>` when `proxyEndpointTemplate` is configured.

## `auth-docen/ci/build/build-vscode.sh` (release / CI)

This script **does not** replace `out/server-main.js` as its main story. It:

1. `cd lib/vscode` (your symlink → `vscode-main`)
2. Patches `product.json` (code-server branding) then runs **one gulp task**:
   - `gulp vscode-reh-web-linux-x64-min` — or without `-min` if `MINIFY=false`
3. Produces a **packaged** tree at **`auth-docen/lib/vscode-reh-web-linux-x64/`** (sibling of `lib/vscode`), used for standalone / release bundles.

That gulp task **chains** compile/minify/bundle steps (`compileBuildWithManglingTask`, extensions, `minify-vscode-reh-web`, then package). After a full run, `lib/vscode/out/` should still exist; **code-server’s Node integration still imports `lib/vscode/out/server-main.js`**, not the files inside `vscode-reh-web-linux-x64`.

### If `build-vscode.sh` fails on task name

Your fork must still register the platform task `vscode-reh-web-linux-x64-min` (see `vscode-main/build/gulpfile.reh.ts`). If upstream renames targets, update the gulp task name in `build-vscode.sh` to match.

## Quick checklist

1. `ln -sfn ../../vscode-main lib/vscode` from `auth-docen/lib/` (see path note at top)
2. In `vscode-main`: `npm install` (once), then `npm run compile` or `npm run compile:server`
3. `test -f vscode-main/out/server-main.js`
4. In `auth-docen`: `npm run build` (tsc `out/node/…`)
5. **Config:** copy `config/startu.config.example.yaml` → `config/startu.local.yaml`, set `JWT_SECRET` (same as gateway); see **`config/README.md`**
6. Run: `CODE_SERVER_CONFIG="$PWD/config/startu.local.yaml" node out/node/entry.js` (with `export JWT_SECRET=…`)

For full web bundle + packaging: set `VERSION=…` and run `npm run build:vscode` from `auth-docen` per `build-vscode.sh`.
