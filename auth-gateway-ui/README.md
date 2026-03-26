# auth-docen auth-gateway UI

Vite + React bundle for the **`--auth=gateway`** login page (`login-gateway.html`), using `@startu/auth-ui-shared` and gateway HTTP helpers from `@startu/auth-chatbot-shared` (`apiClient`).

## When to build

- After changing any file under `auth-gateway-ui/` or upgrading shared packages.
- CI runs `npm run build:auth-gateway-ui` from the **auth-docen** root before `npm run build`.

## Local build

From the **auth-docen** repository root (where `package.json` defines `build:auth-gateway-ui`):

```bash
npm install
npm run build:auth-gateway-ui
```

Output is written to `src/browser/media/auth-gateway/assets/`.

## Dependency resolution (`file:` vs `workspace:*`)

- This package uses **`file:../../packages/auth-ui-shared`** (and chatbot-shared if added) so that **`npm install` from the auth-docen root** resolves shared packages reliably.
- If the monorepo root uses **npm workspaces** and lists these packages, you may switch to **`workspace:*`** in `package.json` for those dependencies instead; always install from the root so paths stay consistent.
