# 部门 ACL 嵌入匿名凭证设计

**日期**: 2026-09-16
**状态**: 待实现
**范围**: 部门 ACL 开启时，嵌入网站（`/chatbot/{site.code}`）与运行链接（`/chat/{site.code}`）隔离：嵌入 URL 携带控制台签发的匿名 JWT，外站访客免控制台登录；运行入口仍走部门 ACL。
**依赖**: `PassportService`、`sites.code`、Web App passport（localStorage）、`ChatAccessGuard`、`decode_jwt_token` 对匿名 EndUser 的拦截、现有嵌入弹窗（iframe / 脚本 / Chrome 插件）

---

## 1. 目标

部门 ACL 打开后，聊天应用仍可嵌入第三方网站。嵌入地址与运行地址路径不同，并在 query 中带上长期有效、可重置的匿名凭证。外站打开嵌入页不要求控制台登录；工作室「运行」仍要求部门成员登录。

成功标准：

1. 已开启 Web App 的聊天应用，复制嵌入代码得到 `/chatbot/{site.code}?embed_token={jwt}`。
2. 无控制台 Cookie 的浏览器打开该嵌入 URL 能进入聊天并发消息。
3. `/chat/{site.code}` 仍走 `ChatAccessGuard` 与控制台登录；手工把 `embed_token` 拼到运行 URL 上不能冒充控制台登录。
4. 「重置嵌入凭证」后旧嵌入代码失效，运行 URL 的 `site.code` 不变。
5. 部门 ACL 关闭时，嵌入代码与现网一致，不带 `embed_token`。

---

## 2. 非目标

- 不改 Service API（`Authorization: Bearer app-...`）。
- 不为 workflow / completion 新增嵌入入口（沿用现有「仅聊天类应用」）。
- 不把嵌入 JWT 设成有 `exp`；作废只靠重置 `embed_jti`。
- 不把运行 URL 改成带 token。
- 不为嵌入使用第二套站点码（不用 `/embed/{另一串}`）。
- 重置嵌入凭证时不轮换 `site.code`；重置公开访问 URL 时不轮换 `embed_jti`。
- 不改 `webapp_auth` 企业 SSO 语义；本功能只在部门 ACL 路径上放行嵌入匿名。

---

## 3. URL 形态与凭证模型

### 3.1 URL

| 入口 | 形态 | 部门 ACL 开启时 |
|------|------|-----------------|
| 运行 | `{origin}/chat/{site.code}` | 控制台登录 + 非匿名 passport |
| 嵌入 iframe / 插件 | `{origin}/chatbot/{site.code}?embed_token={jwt}` | 匿名嵌入 JWT，免控制台登录 |
| 嵌入脚本 | `difyChatbotConfig.token` 仍为 `site.code`；另设 `embedToken`，由 `embed.min.js` 拼进 iframe 的 `embed_token` | 同上 |

`site.code` 两边相同。隔离靠路径（`/chat` vs `/chatbot`）和 query 中的 `embed_token`。

### 3.2 JWT

使用现有 `PassportService.issue`（HS256、`SECRET_KEY`）。payload **不含** `exp` / `iat`，同一 `jti` 多次签发得到同一字符串，保证多次复制 URL 稳定。

| 字段 | 值 |
|------|-----|
| `iss` | `app_id` |
| `sub` | `Web API Passport` |
| `app_id` | 应用 id |
| `app_code` | `site.code` |
| `end_user_id` | 该应用嵌入用匿名 EndUser 的 id |
| `channel` | `embed` |
| `jti` | `sites.embed_jti` |

### 3.3 存储

`sites` 增加可空列 `embed_jti`（UUID 字符串）。空表示尚未签发。

嵌入 EndUser：

- `is_anonymous=True`
- `session_id=embed:{app_id}`
- `type=browser`
- 每个应用至多一条；签发时创建或复用。

重置：写入新的 `embed_jti` 并按新 jti 签发 JWT。旧 JWT 的 `jti` 对不上即失效。不强制删除旧 EndUser（会话记录可保留）；新票仍绑定同一 `session_id=embed:{app_id}` 的 EndUser。

### 3.4 签发前置

必须同时满足：部门 ACL 开启、`app.status=normal`、`site.status=normal`、`enable_site=true`。否则控制台 GET/reset 返回 404，不写入 `embed_jti`。

---

## 4. 鉴权顺序

### 4.1 嵌入页 `/chatbot/{code}`

部门 ACL 开启且路径以 `/chatbot` 开头时，Splash **不渲染** `ChatAccessGuard`，也不调用 `GET /api/passport` 或 `/chat-access/verify`。

1. query 有 `embed_token`：调用 `setWebAppPassport(appCode, embed_token)`，渲染子树。
2. query 无 `embed_token`：直接渲染「嵌入链接无效」，不跳转 `/signin` 或 `/webapp-signin`。
3. 后续 Web API 使用现有 `X-App-Code` + passport header/cookie。
4. `decode_jwt_token`：部门 ACL 开启且 `end_user.is_anonymous` 时，仅当全部成立才放行：
   - payload `channel == "embed"`
   - payload `jti == site.embed_jti`
   - `site` 存在且 `status=normal`
   - `app.enable_site is True`
5. 签名无效、`channel` 不是 `embed`、`jti` 不匹配、Web App 未开：Web API 401。嵌入页展示「嵌入链接无效」。

嵌入路径上的 Web API 401 **禁止**走 `requiredWebSSOLogin`（避免外站访客被拉到「Web 应用身份认证已禁用」）。Splash / share fetch 在 `/chatbot` 上将此类 401 映射为嵌入无效态。

部门 ACL 关闭：嵌入页保持现有匿名 passport 流程；`decode_jwt_token` 不因 `channel` 拒绝。

### 4.2 运行页 `/chat/{code}`

流程不变：`ChatAccessGuard` → 控制台 Cookie → `GET /chat-access/verify` → `/api/passport` 签发 `is_anonymous=False`、`session_id=console:{account_id}`。

忽略 query 里的 `embed_token`。嵌入 JWT 不能当作控制台登录态。

### 4.3 `/api/passport`

部门 ACL 开启时行为不变：必须控制台登录，只签发非匿名票。嵌入路径不调用此接口。

### 4.4 与 R3 匿名封堵的关系

既有规则：部门 ACL 开启且 `end_user.is_anonymous` → 401，用于封掉 ACL 打开前签发的无过期匿名票。

本功能把该判断收窄为：匿名且 **不是** 合法嵌入票（缺 `channel=embed` 或 jti 不匹配）→ 401。合法嵌入票是唯一例外。

---

## 5. 控制台 API 与 UI

### 5.1 API

权限：与能打开嵌入弹窗相同，`edit_permission_required`。

`GET /console/api/apps/{app_id}/site/embed-token`

- 部门 ACL 关闭，或 Web App 未开 / 应用或站点不正常：404。
- 否则若 `embed_jti` 为空则生成、确保嵌入 EndUser、签发 JWT。
- 响应：`{ "embed_token": "<jwt>", "chatbot_path": "/chatbot/{code}?embed_token=<jwt>" }`。
- `chatbot_path` 为路径+query，不含 origin（前端用已有 `app_base_url` 拼接）。

`POST /console/api/apps/{app_id}/site/embed-token/reset`

- 前置与 GET 相同。
- 写入新 `embed_jti`，签发新 JWT，响应形状与 GET 相同。
- 不修改 `site.code`。

现有 `POST /apps/{id}/site/access-token-reset` 只轮换 `site.code`，不改 `embed_jti`。

### 5.2 嵌入弹窗

入口不变：发布器「嵌入网站」、概览卡片「嵌入」。仅聊天类应用。

部门 ACL 开启时，弹窗打开即 GET embed-token，三种代码都带凭证：

- iframe `src`：`{appBaseUrl}{basePath}/chatbot/{code}?embed_token={jwt}`
- 脚本：`window.difyChatbotConfig.embedToken = '{jwt}'`；`embed.js` / `embed.min.js` 把 `embedToken` 写入 iframe URL 的 `embed_token`
- Chrome 插件文案：与 iframe 同一完整 chatbot URL

弹窗提供「重置嵌入凭证」，二次确认后 POST reset，刷新代码区。文案说明外站旧代码会失效。

GET 404（未开 Web App 或 flag 关闭）：不注入 `embed_token`；flag 关闭时代码与现在完全一致。

i18n：仅 `zh-Hans` 与 `en-US` 增加嵌入无效页、重置按钮与确认文案；其余语言走现有 CI 翻译流程。

---

## 6. 组件边界

| 单元 | 职责 | 依赖 |
|------|------|------|
| 迁移 + `Site.embed_jti` | 存当前嵌入凭证版本 | Alembic、`sites` |
| 控制台 embed-token 资源 | 签发 / 重置 JWT 与 EndUser | `PassportService`、`Site`、`EndUser`、`enable_site` |
| `decode_jwt_token` | ACL 下唯一放行合法嵌入匿名票 | payload `channel`/`jti`、`site.embed_jti` |
| Splash | `/chatbot` 跳过 Guard；有 token 则写入 passport，无 token 或 API 401 则显示嵌入无效 | `setWebAppPassport`、share 401 处理 |
| ChatAccessGuard | 仅 `/chat`（及非嵌入 share 页）做部门校验 | 现有 `/chat-access/verify` |
| 嵌入弹窗 + `embed.js` | 把 `embed_token` 编进复制代码和气泡 iframe | GET/reset API |

禁止在 `ChatAccessGuard` 里用「有 query 就算嵌入」处理 `/chat`。禁止让 `/api/passport` 在无控制台登录时签发嵌入票。

---

## 7. 错误处理

| 情况 | 行为 |
|------|------|
| 部门 ACL 关 | 不签发、嵌入代码无 token |
| Web App 未开 | 控制台 GET/reset 404；弹窗不展示带 token 的代码 |
| `/chatbot` 无 `embed_token`（ACL 开） | 页内「嵌入链接无效」，不跳控制台 |
| 签名错误 / `channel` 非 embed / jti 已重置 | Web API 401，嵌入页无效提示 |
| `embed_token` 出现在 `/chat/...` | 仍走部门 ACL |
| 重置公开 URL | 不重置 `embed_jti` |
| 重置嵌入凭证 | 不改 `site.code` |

---

## 8. 测试

先写失败用例再实现。

**后端**

- 首次 GET：写入 `embed_jti`，payload 含 `channel=embed`，EndUser `session_id=embed:{app_id}` 且 `is_anonymous=True`。
- 再次 GET：JWT 字符串与第一次相同。
- reset 后旧 JWT `decode_jwt_token` 401，新 JWT 通过。
- ACL 开启时，无 `channel=embed` 的匿名票仍 401。
- `enable_site=false` 或 ACL 关闭：GET 404，不写 `embed_jti`。
- ACL 下 `/passport` 无控制台登录仍 401。

**前端**

- ACL 开：iframe / 脚本 / 插件代码含 `embed_token`。
- ACL 关：代码不含 `embed_token`。
- Splash：`/chatbot` + query 写入 passport 且不挂 Guard；无 token 渲染无效页。
- `/chat` 即使带 `embed_token` 仍挂 Guard。
- `/chatbot` 上 Web API 401 不跳 `/webapp-signin`。

**浏览器**

- 已开 Web App：无控制台 Cookie 的窗口打开复制出的 iframe URL 能聊天。
- 同一应用运行 URL 仍要登录。
- 重置后旧嵌入 URL 显示无效。

---

## 9. 数据流

```text
编辑者打开嵌入弹窗
  -> GET /console/api/apps/{id}/site/embed-token
  -> 必要时写入 sites.embed_jti + EndUser(embed:{app_id})
  -> 返回 jwt
  -> 复制 /chatbot/{code}?embed_token=jwt

外站加载 iframe
  -> Splash 将 embed_token 写入 passport，跳过 ChatAccessGuard
  -> Web API decode_jwt_token：channel=embed 且 jti 匹配则放行匿名 EndUser
  -> 聊天走既有 message 管道
```
