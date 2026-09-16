# 部门 ACL 嵌入匿名凭证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 部门 ACL 开启时，嵌入 `/chatbot/{site.code}?embed_token={jwt}` 签发可重置的匿名凭证并免控制台登录；运行 `/chat/{site.code}` 仍走部门 ACL。

**Architecture:** `sites.embed_jti` 作为凭证版本。控制台 GET/reset 签发 payload 含 `channel=embed` 的无过期 JWT。嵌入页 Splash 把 query 写入 Web App passport 并跳过 `ChatAccessGuard`。`decode_jwt_token` 只放行 jti 匹配的嵌入匿名票。`/chatbot` 上的 401 不跳转 webapp-signin。

**Tech Stack:** Flask、Alembic、`PassportService`、Next.js shareLayout、TanStack Query / oRPC contract、Vitest、pytest via `uv run --project api`

**Spec:** `docs/superpowers/specs/2026-09-16-department-acl-embed-anonymous-design.md`

## Global Constraints

- 沟通与文档使用简体中文；文档不含 emoji
- Python 用 `uv run --project api`；前端用 `pnpm`
- i18n 仅改 `zh-Hans` 与 `en-US`，key 必须扁平且按字母排序
- 不改 Service API（`app-` key）；不为 workflow/completion 新增嵌入入口
- 嵌入 JWT 无 `exp`；作废只靠重置 `embed_jti`
- 重置嵌入凭证不改 `site.code`；重置公开 URL 不改 `embed_jti`
- 不把运行 URL 改成带 token；不用第二套站点码
- UI 改动必须浏览器点选验证后再声称完成
- TDD：每个行为先写失败测试再写实现
- 不要编辑 spec 文件

## File Structure

- Create: `api/migrations/versions/2026_09_16_2100-d4e6f8a0b2c4_add_site_embed_jti.py` — `sites.embed_jti`
- Modify: `api/models/model.py` — `Site.embed_jti`
- Create: `api/services/embed_token_service.py` — 签发 / 重置
- Create: `api/tests/unit_tests/services/test_embed_token_service.py`
- Modify: `api/controllers/console/app/site.py` — GET/POST embed-token
- Create: `api/tests/unit_tests/controllers/console/app/test_embed_token.py`
- Modify: `api/controllers/web/wraps.py` — 合法嵌入匿名票例外
- Modify: `api/tests/unit_tests/controllers/web/test_wraps.py`
- Modify: `web/contract/console/apps.ts`、`web/contract/router.ts`
- Modify: `web/app/components/app/overview/embedded/index.tsx` 与 `index.spec.tsx`
- Modify: `web/public/embed.js`、`web/public/embed.min.js`
- Modify: `web/app/(shareLayout)/components/splash.tsx`
- Create: `web/__tests__/department/splash-embed-token.test.tsx`
- Modify: `web/app/(shareLayout)/components/authenticated-layout.tsx`
- Modify: `web/service/base.ts` — `/chatbot` 上跳过 `requiredWebSSOLogin`
- Modify: `web/i18n/zh-Hans/share.json`、`web/i18n/en-US/share.json`、`web/i18n/zh-Hans/app-overview.json`、`web/i18n/en-US/app-overview.json`

---

### Task 1: `embed_jti` 列与 EmbedTokenService

**Files:**
- Create: `api/migrations/versions/2026_09_16_2100-d4e6f8a0b2c4_add_site_embed_jti.py`
- Modify: `api/models/model.py`（`Site` 在 `code` 旁增加 `embed_jti`）
- Create: `api/services/embed_token_service.py`
- Test: `api/tests/unit_tests/services/test_embed_token_service.py`

**Interfaces:**
- Consumes: `FeatureService.get_system_features().department_access_control`、`App.enable_site`、`Site.code` / `status`、`PassportService.issue`
- Produces: `EmbedTokenService.ensure_token(app_model, site) -> dict[str, str]` 与 `EmbedTokenService.reset_token(app_model, site) -> dict[str, str]`，返回 `{"embed_token": jwt, "chatbot_path": "/chatbot/{code}?embed_token={jwt}"}`；不满足前置时 `werkzeug.exceptions.NotFound`；JWT payload 键为 `iss, sub, app_id, app_code, end_user_id, channel, jti`；EndUser `session_id=f"embed:{app_model.id}"`、`is_anonymous=True`

- [ ] **Step 1: 写失败测试**

```python
# api/tests/unit_tests/services/test_embed_token_service.py
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from werkzeug.exceptions import NotFound

from services.embed_token_service import EmbedTokenService


def _app(*, enable_site: bool = True, status: str = "normal") -> SimpleNamespace:
    return SimpleNamespace(id="app-1", tenant_id="t1", enable_site=enable_site, status=status)


def _site(*, code: str = "code1", embed_jti: str | None = None, status: str = "normal") -> SimpleNamespace:
    return SimpleNamespace(code=code, embed_jti=embed_jti, status=status, app_id="app-1")


@patch("services.embed_token_service.FeatureService.get_system_features")
def test_flag_off_raises_not_found(mock_features: MagicMock) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=False)
    with pytest.raises(NotFound):
        EmbedTokenService.ensure_token(_app(), _site())


@patch("services.embed_token_service.FeatureService.get_system_features")
def test_site_disabled_raises_not_found(mock_features: MagicMock) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    with pytest.raises(NotFound):
        EmbedTokenService.ensure_token(_app(enable_site=False), _site())


@patch("services.embed_token_service.PassportService")
@patch("services.embed_token_service.db")
@patch("services.embed_token_service.FeatureService.get_system_features")
def test_first_ensure_writes_jti_and_anonymous_end_user(
    mock_features: MagicMock, mock_db: MagicMock, mock_passport_cls: MagicMock
) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    mock_db.session.scalar.return_value = None
    mock_passport_cls.return_value.issue.return_value = "jwt-1"
    site = _site()
    result = EmbedTokenService.ensure_token(_app(), site)
    assert result["embed_token"] == "jwt-1"
    assert result["chatbot_path"].startswith("/chatbot/code1?embed_token=")
    assert site.embed_jti
    payload = mock_passport_cls.return_value.issue.call_args[0][0]
    assert payload["channel"] == "embed"
    assert payload["jti"] == site.embed_jti
    assert payload["app_code"] == "code1"
    end_user = mock_db.session.add.call_args[0][0]
    assert end_user.is_anonymous is True
    assert end_user.session_id == "embed:app-1"


@patch("services.embed_token_service.PassportService")
@patch("services.embed_token_service.db")
@patch("services.embed_token_service.FeatureService.get_system_features")
def test_second_ensure_same_jwt(
    mock_features: MagicMock, mock_db: MagicMock, mock_passport_cls: MagicMock
) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    site = _site(embed_jti="jti-fixed")
    existing = SimpleNamespace(id="eu-embed", is_anonymous=True, session_id="embed:app-1")
    mock_db.session.scalar.return_value = existing
    mock_passport_cls.return_value.issue.return_value = "jwt-same"
    first = EmbedTokenService.ensure_token(_app(), site)
    second = EmbedTokenService.ensure_token(_app(), site)
    assert first["embed_token"] == second["embed_token"]
    assert site.embed_jti == "jti-fixed"
    mock_db.session.add.assert_not_called()


@patch("services.embed_token_service.PassportService")
@patch("services.embed_token_service.db")
@patch("services.embed_token_service.FeatureService.get_system_features")
def test_reset_rotates_jti(
    mock_features: MagicMock, mock_db: MagicMock, mock_passport_cls: MagicMock
) -> None:
    mock_features.return_value = SimpleNamespace(department_access_control=True)
    site = _site(embed_jti="old-jti")
    mock_db.session.scalar.return_value = SimpleNamespace(id="eu-embed")
    mock_passport_cls.return_value.issue.return_value = "jwt-new"
    EmbedTokenService.reset_token(_app(), site)
    assert site.embed_jti != "old-jti"
```

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run --project api pytest api/tests/unit_tests/services/test_embed_token_service.py -q`

Expected: FAIL（模块不存在）

- [ ] **Step 3: 迁移与模型**

`down_revision = "c7d8e9f0a1b3"`。`upgrade`：`sites` 增加可空 `embed_jti` `sa.String(length=36)`。`Site` 增加 `embed_jti = mapped_column(String(36), nullable=True)`。

- [ ] **Step 4: 实现 `EmbedTokenService`**

`ensure_token` / `reset_token`：flag 关、`enable_site` 假、`app.status != "normal"`、`site.status != "normal"` → `NotFound`。否则保证 `embed_jti`（reset 时强制新 UUID）、查或建 EndUser、`PassportService().issue` 固定键顺序 payload、`db.session.commit()`、返回 dict。`chatbot_path` 使用 `urllib.parse.urlencode` 或 f-string `/chatbot/{site.code}?embed_token={jwt}`。

- [ ] **Step 5: 跑测试确认通过**

Run: `uv run --project api pytest api/tests/unit_tests/services/test_embed_token_service.py -q`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/migrations/versions/2026_09_16_2100-d4e6f8a0b2c4_add_site_embed_jti.py api/models/model.py api/services/embed_token_service.py api/tests/unit_tests/services/test_embed_token_service.py
git commit -m "$(cat <<'EOF'
feat(department): add site embed_jti and embed token issuer

EOF
)"
```

---

### Task 2: 控制台 GET/reset embed-token

**Files:**
- Modify: `api/controllers/console/app/site.py`
- Test: `api/tests/unit_tests/controllers/console/app/test_embed_token.py`

**Interfaces:**
- Consumes: `EmbedTokenService.ensure_token` / `reset_token`、`@edit_permission_required`、`@get_app_model`
- Produces: `GET /console/api/apps/<uuid:app_id>/site/embed-token` 与 `POST /console/api/apps/<uuid:app_id>/site/embed-token/reset`，JSON `{embed_token, chatbot_path}`；站点不存在 404；不修改 `site.code`

- [ ] **Step 1: 写失败测试**

用 Flask test app + patch `EmbedTokenService` 与 `db.session.scalar`。断言 GET 调用 `ensure_token` 并返回其 dict；POST reset 调用 `reset_token` 且不改 `site.code`；无 Site 时 `NotFound`。

参考 `api/controllers/console/app/site.py` 中 `AppSiteAccessTokenReset` 的装饰器顺序：`setup_required`、`login_required`、`edit_permission_required`、`account_initialization_required`、`get_app_model`。reset **不要**用 `is_admin_or_owner_required`。

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run --project api pytest api/tests/unit_tests/controllers/console/app/test_embed_token.py -q`

Expected: FAIL（路由/类不存在）

- [ ] **Step 3: 实现两个 Resource**

在 `site.py` 增加路由。GET：查 Site，没有则 `NotFound`，否则 `return EmbedTokenService.ensure_token(app_model, site)`。POST reset 同理调 `reset_token`。不要 `@marshal_with(app_site_model)`。

- [ ] **Step 4: 跑测试确认通过**

Run: `uv run --project api pytest api/tests/unit_tests/controllers/console/app/test_embed_token.py api/tests/unit_tests/services/test_embed_token_service.py -q`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/controllers/console/app/site.py api/tests/unit_tests/controllers/console/app/test_embed_token.py
git commit -m "$(cat <<'EOF'
feat(console): issue and reset department embed tokens

EOF
)"
```

---

### Task 3: `decode_jwt_token` 放行合法嵌入匿名票

**Files:**
- Modify: `api/controllers/web/wraps.py`
- Modify: `api/tests/unit_tests/controllers/web/test_wraps.py`

**Interfaces:**
- Consumes: JWT `channel` / `jti`、`site.embed_jti`、`app_model.enable_site`
- Produces: `_is_valid_embed_passport(decoded, site, app_model) -> bool`；ACL + 匿名时仅合法嵌入票通过，其余仍 `Unauthorized("Anonymous access is not allowed under department access control.")`

- [ ] **Step 1: 写失败测试**

在 `TestDecodeJwtToken`（或同文件现有 `test_flag_on_anonymous_user_rejected` 附近）增加：

1. 保留：flag on + 匿名 + 无 `channel` → 仍 match `"Anonymous access"`
2. 新增：payload `channel="embed"`、`jti="jti-1"`，`site.embed_jti="jti-1"`，`enable_site=True` → 返回 `(app_model, end_user)`
3. 新增：`channel="embed"` 但 `jti="old"`、`site.embed_jti="new"` → Anonymous access
4. 新增：合法 embed 但 `enable_site=False` → Anonymous access

现有 `test_flag_on_anonymous_user_rejected` 的 `site = SimpleNamespace(code="code1")` 无 `embed_jti`，行为应仍失败。

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run --project api pytest api/tests/unit_tests/controllers/web/test_wraps.py -q -k "anonymous or embed"`

Expected: 新用例 FAIL（仍一律拒绝匿名）

- [ ] **Step 3: 实现例外**

在匿名拦截处改为调用 `_is_valid_embed_passport`。不要改 `/passport`。

- [ ] **Step 4: 跑 wraps + passport 部门门控回归**

Run: `uv run --project api pytest api/tests/unit_tests/controllers/web/test_wraps.py api/tests/unit_tests/controllers/web/test_passport_department_gate.py -q`

Expected: PASS（passport 无控制台登录仍 401）

- [ ] **Step 5: Commit**

```bash
git add api/controllers/web/wraps.py api/tests/unit_tests/controllers/web/test_wraps.py
git commit -m "$(cat <<'EOF'
fix(web): allow resettable embed anonymous passports under department ACL

EOF
)"
```

---

### Task 4: 前端契约与嵌入弹窗

**Files:**
- Modify: `web/contract/console/apps.ts`
- Modify: `web/contract/router.ts`（`consoleRouterContract.apps` 增加 `embedToken` / `resetEmbedToken`）
- Modify: `web/app/components/app/overview/embedded/index.tsx`
- Modify: `web/app/components/app/overview/embedded/index.spec.tsx`
- Modify: `web/i18n/zh-Hans/app-overview.json`、`web/i18n/en-US/app-overview.json`

**Interfaces:**
- Consumes: `consoleQuery.apps.embedToken.queryOptions({ input: { params: { appId } }, enabled: flag && isShow && !!appId })`；`consoleQuery.apps.resetEmbedToken.mutationOptions()`
- Produces: `OPTION_MAP.*.getContent` 增加可选 `embedToken?: string`；ACL 开且 GET 成功时 iframe/脚本/插件 URL 含 `embed_token=`；ACL 关时与现在字符串一致；重置按钮二次确认后刷新 token

- [ ] **Step 1: 写失败测试**

扩展 `index.spec.tsx`：mock `useGlobalPublicStore` 的 `department_access_control`、`useAppStore` 或传入 `appId`。

- ACL 关：复制 iframe 仍为 `/chatbot/token` 且不含 `embed_token`
- ACL 开：mock GET 返回 `{ embed_token: "jwt-emb", chatbot_path: "/chatbot/token?embed_token=jwt-emb" }`，复制内容含 `embed_token=jwt-emb`

需要给 `Embedded` 增加 `appId?: string`（发布器与 `app-card` 传入 `appDetail.id` / `appInfo.id`）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test -- app/components/app/overview/embedded/index.spec.tsx`

Expected: FAIL（无 embed_token 行为）

- [ ] **Step 3: 契约**

```typescript
export type AppSiteEmbedTokenResponse = {
  embed_token: string
  chatbot_path: string
}

export const appSiteEmbedTokenContract = base
  .route({ path: '/apps/{appId}/site/embed-token', method: 'GET' })
  .input(type<{ params: { appId: string } }>())
  .output(type<AppSiteEmbedTokenResponse>())

export const appSiteEmbedTokenResetContract = base
  .route({ path: '/apps/{appId}/site/embed-token/reset', method: 'POST' })
  .input(type<{ params: { appId: string } }>())
  .output(type<AppSiteEmbedTokenResponse>())
```

`router.ts` 的 `apps` 挂上这两个 contract。

- [ ] **Step 4: 弹窗实现**

flag 开且 `isShow` 时 `useQuery` GET。`getContent(url, token, ..., embedToken?)`：有 embedToken 时 chatbot URL 加 `?embed_token=`。脚本片段增加 `embedToken: '...'`（仅有值时）。重置：`window.confirm` 或现有 Modal 确认，文案 key：

- `overview.appInfo.embedded.reset`
- `overview.appInfo.embedded.resetConfirm`

插入时保持 JSON key 字母序。zh-Hans：「重置嵌入凭证」/「重置后已嵌入外站的代码将失效，需要重新复制。确定重置吗？」en-US："Reset embed credential" / "Existing embed snippets will stop working. Reset?"

GET 失败：不注入 token。

`app-publisher/index.tsx` 与 `overview/app-card.tsx` 传入 `appId`。

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm test -- app/components/app/overview/embedded/index.spec.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/contract/console/apps.ts web/contract/router.ts web/app/components/app/overview/embedded web/app/components/app/app-publisher/index.tsx web/app/components/app/overview/app-card.tsx web/i18n/zh-Hans/app-overview.json web/i18n/en-US/app-overview.json
git commit -m "$(cat <<'EOF'
feat(web): append embed_token when copying chatbot snippets

EOF
)"
```

---

### Task 5: `embed.js` 把 `embedToken` 拼进 iframe

**Files:**
- Modify: `web/public/embed.js`
- Modify: `web/public/embed.min.js`（与 `embed.js` 同一逻辑，气泡 iframe 必须带 query）

**Interfaces:**
- Consumes: `window.difyChatbotConfig.embedToken`
- Produces: `iframeUrl` 含 `embed_token`（不要 gzip 该值）

- [ ] **Step 1: 在 `embed.js` 创建 `iframeUrl` 之前加入**

```javascript
if (config.embedToken) {
  params.set("embed_token", config.embedToken);
}
```

同步修改 `embed.min.js` 对应位置（`params` 合并之后、`iframeUrl` 赋值之前）。

- [ ] **Step 2: 用 node 抽一段断言（可选最小脚本）或依赖 Task 4 脚本 snippet 单测已含 `embedToken` 字段**

若无现成 embed.js 单测，不要为 min.js 新开测试框架；Task 4 已覆盖 config 字段，本任务保证运行时读取。

- [ ] **Step 3: Commit**

```bash
git add web/public/embed.js web/public/embed.min.js
git commit -m "$(cat <<'EOF'
feat(web): pass embedToken from bubble script into chatbot iframe

EOF
)"
```

---

### Task 6: Splash 跳过 Guard、无效页、chatbot 401 不跳登录

**Files:**
- Modify: `web/app/(shareLayout)/components/splash.tsx`
- Create: `web/__tests__/department/splash-embed-token.test.tsx`
- Modify: `web/app/(shareLayout)/components/authenticated-layout.tsx`
- Modify: `web/service/base.ts`（`requiredWebSSOLogin`）
- Modify: `web/i18n/zh-Hans/share.json`、`web/i18n/en-US/share.json`

**Interfaces:**
- Consumes: `usePathname()`、`searchParams.get("embed_token")`、`systemFeatures.department_access_control`、`setWebAppPassport`
- Produces: ACL 开且 path 以 `/chatbot` 开头时不渲染 `ChatAccessGuard`；有 token 则 `setWebAppPassport(shareCode, token)`；无 token 渲染 `common.embedLinkInvalid`；`requiredWebSSOLogin` 在 `pathname.startsWith("/chatbot")` 时直接 return；`AuthenticatedLayout` 在 chatbot 路径且 `appInfoError` 时同样展示 `common.embedLinkInvalid`

- [ ] **Step 1: 写失败测试 `splash-embed-token.test.tsx`**

Mock：`usePathname`、`useSearchParams`、`useGlobalPublicStore`、`useWebAppStore`、`webAppLoginStatus`、`setWebAppPassport`、`ChatAccessGuard`（渲染 `data-testid="chat-access-guard"`）、`Loading`。

用例：

1. ACL 开、`pathname=/chatbot/code1`、`embed_token=jwt` → 调用 `setWebAppPassport("code1", "jwt")`，**没有** `chat-access-guard`，有 children
2. ACL 开、`/chatbot/code1`、无 token → 文本 `common.embedLinkInvalid`，无 Guard
3. ACL 开、`pathname=/chat/code1` 即使 search 有 `embed_token` → **有** `chat-access-guard`（运行入口不变）
4. ACL 关、`/chatbot/code1` → 无无效页、无强制 passport 写入（走现有 splash 登录逻辑；可将 `webAppLoginStatus` resolve `{userLoggedIn:true, appLoggedIn:true}` 以结束 loading）

i18n 测试 mock `t: (key) => key`。

另测 `requiredWebSSOLogin`：可把函数抽到可测模块，或给 `base.ts` 单测。最小做法：在 splash 测试之外新增 `web/service/__tests__/required-web-sso-login.spec.ts` 若抽取困难，则在 Task 步骤里改 `requiredWebSSOLogin` 开头：

```typescript
if (globalThis.location.pathname.startsWith('/chatbot'))
  return
```

并写一个针对该守卫的小纯函数：

```typescript
export const shouldSkipWebSsoRedirect = (pathname: string) => pathname.startsWith('/chatbot')
```

放在 `web/app/(shareLayout)/components/embed-access.ts`，splash 与 base 共用。单测该函数 + splash。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test -- __tests__/department/splash-embed-token.test.tsx`

Expected: FAIL

- [ ] **Step 3: 实现**

`embed-access.ts`：

```typescript
export const isChatbotPath = (pathname: string) => pathname.startsWith('/chatbot')
```

Splash：ACL && `isChatbotPath(pathname)` 时，跳过 Guard 分支；无 token 返回无效文案；有 token 则 `useEffect` 里 `setWebAppPassport`。仍要跑现有 `webAppLoginStatus` 时：chatbot+ACL 路径可短路，避免无 passport 时 `fetchAccessToken` 401 把人带走——**在 chatbot+ACL 时不要调用 `webAppLoginStatus` / `fetchAccessToken`**。

`requiredWebSSOLogin`：`isChatbotPath` 则 return。

`AuthenticatedLayout`：`isChatbotPath(pathname)` 且 `appInfoError` / `appParamsError` 时展示 `t('common.embedLinkInvalid', { ns: 'share' })` 而不是通用 AppUnavailable（或 unknownReason 用该文案）。

i18n（字母序插入）：

- en-US share：`"common.embedLinkInvalid": "This embed link is invalid."`
- zh-Hans share：`"common.embedLinkInvalid": "嵌入链接无效"`

- [ ] **Step 4: 跑相关前端测试**

Run: `pnpm test -- __tests__/department/splash-embed-token.test.tsx __tests__/department/chat-access-guard.test.tsx app/components/app/overview/embedded/index.spec.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app/(shareLayout)/components/splash.tsx web/app/(shareLayout)/components/authenticated-layout.tsx web/app/(shareLayout)/components/embed-access.ts web/service/base.ts web/__tests__/department/splash-embed-token.test.tsx web/i18n/zh-Hans/share.json web/i18n/en-US/share.json
git commit -m "$(cat <<'EOF'
feat(web): skip department chat guard for chatbot embed tokens

EOF
)"
```

---

### Task 7: 浏览器验证

**Files:** 无新文件（本地 `flask db upgrade`）

- [ ] **Step 1: 迁移**

Run: `uv run --project api flask db upgrade`（在 `api/` 或仓库根按现有 dev 方式）

- [ ] **Step 2: 嵌入放行**

用已开 Web App 的聊天应用，登录编辑者 → 发布 → 嵌入网站 → 复制 iframe `src`。新开无控制台 Cookie 的窗口（或隐身）打开该 URL。应出现聊天输入框，能发送一条消息。不得出现 App not found、嵌入无效、控制台登录、Web 应用身份认证已禁用。

- [ ] **Step 3: 运行入口仍门控**

同一应用点「运行」。未登录应进控制台登录或部门拒绝；已登录部门成员应能聊。URL 为 `/chat/{code}` 且无 `embed_token`。

- [ ] **Step 4: 重置**

弹窗重置嵌入凭证 → 旧 iframe URL 显示「嵌入链接无效」；新复制的 URL 能聊。`/chat/{code}` 的站点码不变。

- [ ] **Step 5: ACL 关的回归**（若本地可关 flag）嵌入代码不含 `embed_token`。不能关则在单测覆盖即可，浏览器步骤写明跳过原因。

- [ ] **Step 6: Commit**（仅当验证中有修复）

```bash
git commit -m "$(cat <<'EOF'
fix(department): polish embed anonymous access after browser checks

EOF
)"
```

---

## Self-Review

**Spec coverage:** URL/JWT/jti（Task 1–2）、decode 例外（Task 3）、弹窗三种代码（Task 4–5）、Splash/Guard/401（Task 6）、enable_site 与 flag 关（Task 1–2、4）、reset 不影响 site.code（Task 2、7）、浏览器（Task 7）。`/passport` 不改，Task 3 回归门控测试。

**Placeholders:** 无 TBD。Task 5 无独立单测已写明由 Task 4 覆盖。

**Types:** `embed_token`、`chatbot_path`、`channel=embed`、`session_id=embed:{app_id}`、query 名 `embed_token`、config 名 `embedToken` 前后一致。
