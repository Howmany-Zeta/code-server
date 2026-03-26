# auth-docen（Startu）配置说明

## 文件

| 文件 | 说明 |
|------|------|
| `startu.config.example.yaml` | 示例：**gateway 鉴权**、本地绑定、无 TLS。复制后改名使用。 |
| `startu.local.yaml` | **不放仓库**（已 `.gitignore`）。你本机的真实配置与密钥。 |

## 前置条件

1. **`lib/vscode` → 仓库根目录 `vscode-main`**（见 `docs/vscode-main-symlink.md`）。
2. 在 **`vscode-main`** 执行过 **`npm run compile`**（存在 `out/server-main.js`）。
3. 在 **`auth-docen`** 执行过 **`npm run build`**（生成 `out/node/entry.js`）。

## 快速开始

在 **普通 shell（SSH、系统终端）** 里启动最省事。若在 **Cursor / VS Code 集成终端** 里启动，请先取消 IDE 注入的环境变量，否则会误走「连接到已有 VS Code」分支并报错：`Please specify at least one file or folder`。

```bash
cd auth-docen
cp config/startu.config.example.yaml config/startu.local.yaml
# 编辑 startu.local.yaml；密钥建议只靠环境变量，不在 YAML 里写
export JWT_SECRET='与 express-gateway/.env 中 JWT_SECRET 相同'
unset VSCODE_IPC_HOOK_CLI   # 集成终端里务必执行；外部 SSH 终端一般无需
CODE_SERVER_CONFIG="$PWD/config/startu.local.yaml" node out/node/entry.js
```

浏览器打开输出的地址（默认 `http://127.0.0.1:8080`），未带 cookie 时会进 **`/login`**（**`gateway`** 模式：内置网关登录 UI，见 `src/browser/pages/login-gateway.html` 与 `auth-gateway-ui/` 构建产物）。

## 与 express-gateway 对齐

- **`JWT_SECRET`**：网关签发用户 JWT 与 auth-docen `auth: gateway` 校验 **必须是同一 secret**。

### D3b：Workbench 单点引导（`startudiscovery`）

- 用户持有效网关 JWT cookie 访问 workbench 时，**vscode server**（`webClientServer`）会用与 docen 相同的 **`jwt-secret`** 校验 cookie，并在 HTML 中注入 **`WORKBENCH_AUTH_SESSION`**（见 `vscode-main/docs/auth-docen-core-patch-traceability.md`）。
- 启动 vscode server 的参数需包含 **`--jwt-secret`**（或与 `JWT_SECRET` 同步来源）及 **`--cookie-suffix`**（若 YAML 配置了 `cookie-suffix`），与 auth-docen 一致；否则不会生成 Startu 引导 JSON，用户在 web 里仍需再走扩展登录。
- **§D3**：上述配置齐全时，用户完成**网关**登录后首屏 workbench 即可具备 **Startu 平台会话**（无需再单独打开扩展登录向导），除非后续定义「step-up」再验证策略。

### D4a Option B：跨站 handoff

- 网关 **`POST /auth/handoff/issue`**（需已登录用户的 Bearer）换 **`code`**；浏览器访问 **`GET /session/handoff?code=…&to=…`**（本仓库 `sessionHandoff` 路由）。由 **docen 服务端** `POST` 到网关 **`POST /auth/handoff/redeem`**，成功后设置会话 cookie 并 302 回 IDE。
- 须配置 **`gateway-url`** / `STARTU_GATEWAY_URL` 指向 express-gateway。

### 令牌刷新（网关）

- **`POST /auth/refresh`**：请求头 `Authorization: Bearer <current_user_jwt>`，未过期则签发新 JWT（见 `express-gateway` `authRouter.js`）。auth-chatbot / 部署文档可引用此端点做 **§D7** 最小路径。

### auth-chatbot（Next）对齐点

- **网关身份**：登录/注册走 **`API_BASE_URL`** 上 **`/auth/login`**、**`/auth/register`**；NextAuth 凭据会话中持有 **gateway user JWT**（服务端 JWT cookie 内刷新，不经由浏览器 JS）。
- **Option B**：`STARTU_AUTH_HANDOFF_TO_DOCEN=true` 且配置 **`AUTH_DOCEN_PUBLIC_URL`**（或 `NEXT_PUBLIC_AUTH_DOCEN_ORIGIN`）时，邮箱注册/登录成功后会 **302 业务到 docen** `/session/handoff?code=…`（由网关 `handoff/issue` 换码）。Google 登录仍以 NextAuth 回调为准；跨产品直达 IDE 时优先用手动导航或后续在站点内补「打开 IDE」入口。
- **Option A**：可选 **`AUTH_CHATBOT_SESSION_COOKIE_DOMAIN`** 与 docen/gateway cookie 策略用运维文档对齐（父域 + `Secure` / `SameSite`）。

登录页 UI 变更后，在 auth-docen 根目录执行 **`npm run build:auth-gateway-ui`**（CI 在 `npm run build` 前也会执行），详见 **`auth-gateway-ui/README.md`**。
- 扩展（auth-chatbot-core）默认网关 **`http://localhost:3001`**；网关改端口时在 VS Code **设置**里改 `authChatbot.gatewayUrl`（不是本 YAML 字段）。

## 其他认证方式

- **密码**：`auth: password` + `password:` 或环境变量（见上游 code-server 文档）。
- **关闭鉴权**（仅本地调试）：`auth: none`。

## 同域名与 express-gateway（`ALLOWED_ORIGINS`）

与 OpenSpec **ADR 001** 一致：默认 **单 origin + 路径前缀**（浏览器地址栏一个 `scheme://host:port`）。**express-gateway** 的 `ALLOWED_ORIGINS` 须包含该 origin（逗号分隔多条仅在你刻意使用多个浏览器 origin 时，例如子域模型）。登录页从该 origin 对网关做 `fetch` 时，网关 CORS 与 Google OAuth 的 `return_to` 校验均依赖同一列表。生产环境请同时配置：`JWT_SECRET`、`ALLOWED_ORIGINS`、`PUBLIC_GATEWAY_URL`、Google OAuth 客户端与 `GOOGLE_REDIRECT_URI`（见 `express-gateway/README.md`）。

## 共享域名：负载均衡 → auth-docen 与 auth-compose

- **auth-docen**：浏览器入口（登录、`/_static`、VS Code 路由、代理等）。
- **auth-compose**（vscode-main server）：远程开发后端；本 release 使用 **单 URL** 环境变量注入（如 **`AUTH_COMPOSE_URL`**），**不**做「租户 ID → 动态 compose URL 模板」运行时解析（后续项）。
- 边缘 **LB / 反代** 按路径或内部规则将流量分到对应 Cloud Run（或等价）服务；具体路径图由运维选定，须在 runbook 可核对。

### 常用环境变量（对齐 design / 网关）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 与 express-gateway 一致，用于校验会话 cookie 中的用户 JWT。 |
| `STARTU_GATEWAY_URL` / `--gateway-url` | 网关公网或内网可达 base URL（登录 UI、注册、Google OAuth 起点）。 |
| `VSCODE_PROXY_URI` | 与 code-server 一致，转发端口 / `asExternalUri` 模板。 |
| `AUTH_COMPOSE_URL` | 本修订版单一 compose 上游 base（若适用）；多租户 URL 模板为 **后续** 能力。 |
| `CODE_SERVER_SESSION_COOKIE_SUFFIX` 等 | 与上游 cookie 后缀文档一致（见 CLI `cookie-suffix`）。 |

## Cookie：`Domain` / `SameSite` / `Secure`（路径前缀 + 单 origin）

- **默认（ADR 001）**：**host-only** Cookie（不显式设置跨子域 `Domain`）；HTTPS 部署下设置 `Secure`；`SameSite` 按浏览器与是否跨站调用网关而定（通常 `Lax`/`None`+`Secure` 组合由部署验证）。
- **子域模型（可选）**：若每租户独立子域，可配置 `Domain=.example.com`，且 **`ALLOWED_ORIGINS`** 与 OAuth 重定向 URI 须 **逐条** 覆盖各 origin（见 ADR 001）。

## 信任边界（auth-docen → auth-compose）

默认模型：**auth-docen 在可信网络内对上游透传与浏览器一致的会话 Cookie**；auth-compose **不应**对公网暴露，或应限制入口来源（仅 docen、VPC、内网）。若无法满足网络隔离，应按 `design.md` Risks 评估 **HMAC / 服务令牌** 等后续项（占位见 `adr/002-signed-internal-headers-followup.md`）。

### Release / 部署自检（可执行）

- [ ] 确认 **auth-compose** 所在 Cloud Run（或等价）**未**绑定不必要的公网 LB，或已限制来源（VPC / 内网 / 仅 docen 可达）。
- [ ] 若 compose 必须对非信任网络暴露：在发布跟踪中立项 **内部令牌 / 签名头**（ADR 002），勿仅依赖 Cookie 透传。

## 登出冒烟（手动）

发布或 PR 验证建议：

1. 已登录状态下执行 workbench **Logout**（或访问配置的 `logoutEndpoint`）；扩展 **Startu: Sign Out** 在 server-web 下还会尝试 `code-server.logout` 以清除 docen 门禁 cookie，应与 **`/logout`** 协调一致。
2. 确认会话 cookie 清除，刷新后需重新登录。
3. 若配置了网关登出 URL，确认与 `logoutEndpoint` 行为一致。

（自动化 e2e 仅当仓库已有登录 e2e 链路时再扩展。）
