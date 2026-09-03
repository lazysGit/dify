# 模型权限控制与发布审批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现租户内模型调用白名单控制（管理员可限制成员可用模型）与应用发布审批门控（按角色限制可发布部门范围）

**Architecture:** Feature 1 新增 `account_model_whitelist` 表存储用户级模型白名单，通过 `ModelPermissionService` 在模型列表查询时过滤；Feature 2 复用现有 `app_published_departments` 表，在 `AppPublishService.update_published_departments()` 中追加 `_check_publish_permission()` 守卫。两功能独立，共享审计日志基础设施。

**Tech Stack:** Python Flask + SQLAlchemy(TypeBase/MappedAsDataclass) + Alembic + Flask-RESTx + Pydantic v2；前端 Next.js App Router + TS strict + TanStack Query + oRPC contract（`web/contract/console/`）+ Tailwind + base/ui 组件；测试 pytest（unit_tests，MagicMock 工厂模式）+ Vitest/RTL。

---

## Global Constraints

- 设计文档中的代码样例仅作参考：**必须**用现有 Dify 后端分层模式（Flask-RESTx `@console_ns.route()` + Pydantic v2 `model_validate(console_ns.payload)`，参照 `api/controllers/console/workspace/members.py`）
- 迁移链 head 为 M5 迁移后的最新 revision（执行前跑 `flask db heads` 确认）；新迁移接在当前 head 之后
- uuid 一律用 `uuid_generate_v4()`（uuid-ossp 扩展已由 init 迁移启用，勿用 gen_random_uuid）
- 白名单隐式规则：无记录 = 全部可用（向后兼容），有记录 = 仅允许白名单模型
- owner/admin 不受白名单限制（始终可使用所有系统模型）
- 审计日志统一写 `OperationLog`（`api/models/model.py:1918`），service 层经 `DepartmentAuditLog.log(tenant_id, operator_id, operator_ip, action, content)` 落库，operator_ip 由控制器传 `request.remote_addr`
- 后端：`uv run --project api`；Ruff 120 字符双引号；文件 <800 行；所有查询带 tenant_id；服务层错误继承 `services/errors/base.py::BaseServiceError`，新领域错误放 `api/services/errors/model_permission.py`
- 前端：`pnpm`；`no-explicit-any: error`；新服务调用走 `web/contract/console/` oRPC 契约 + `consoleQuery`；i18n key 平铺排序，只加 `zh-Hans` 与 `en-US`（其余语言由 CI 翻译流程补齐，既有惯例）；UI 用 `@/app/components/base/ui/*`（AlertDialog/toast），不用 deprecated 的 Confirm/ToastContext
- 每个任务结束跑对应测试并 commit（conventional commits：`feat(scope): ...`）；**U6：后端任务 commit 前对 touched 文件跑 `uv run --project api ruff check --fix`（不只 Task 5 记得跑）**
- Feature 1 和 Feature 2 完全独立，可并行开发；本计划按顺序列出便于跟踪

---

## Milestone 1：数据库层（模型白名单表 + 迁移）

### Task 1: AccountModelWhitelist 模型与注册

**Files:**
- Create: `api/models/model_permission.py`
- Modify: `api/models/__init__.py`（import + `__all__`）
- Test: `api/tests/unit_tests/models/test_model_permission.py`

**Interfaces (Produces):**
- `class AccountModelWhitelist(TypeBase)`，表 `account_model_whitelist`，字段：`id: StringUUID`、`tenant_id: StringUUID`、`account_id: StringUUID`、`provider_name: str`（String(255)）、`model_name: str`（String(255)）、`model_type: str`（String(255)）、`created_by: StringUUID`、`created_at: datetime`
- 约束：`PrimaryKeyConstraint("id", name="account_model_whitelist_pkey")`；`UniqueConstraint("account_id","provider_name","model_name","model_type", name="unique_account_model")`；索引 `account_model_whitelist_account_idx`（account_id）、`account_model_whitelist_tenant_idx`（tenant_id）

- [x] **Step 1: 写失败测试**（验证表名、列、约束存在）：

```python
# api/tests/unit_tests/models/test_model_permission.py
from models.model_permission import AccountModelWhitelist


def test_account_model_whitelist_tablename_and_columns():
    assert AccountModelWhitelist.__tablename__ == "account_model_whitelist"
    cols = AccountModelWhitelist.__table__.columns.keys()
    for expected in ("id", "tenant_id", "account_id", "provider_name", "model_name",
                     "model_type", "created_by", "created_at"):
        assert expected in cols


def test_account_model_whitelist_unique_constraint():
    constraints = {c.name for c in AccountModelWhitelist.__table__.constraints}
    assert "unique_account_model" in constraints
    indexes = {i.name for i in AccountModelWhitelist.__table__.indexes}
    assert "account_model_whitelist_account_idx" in indexes
    assert "account_model_whitelist_tenant_idx" in indexes
```

- [x] **Step 2: 跑测试确认失败** — `uv run --project api pytest tests/unit_tests/models/test_model_permission.py -v` → FAIL（模块不存在）
- [x] **Step 3: 实现模型** — 新建 `api/models/model_permission.py`，完全仿照 `api/models/account.py:274` 的 `TenantAccountJoins(TypeBase)` 写法（MappedAsDataclass，`StringUUID` from `models.types`，created_at 用 `server_default=func.current_timestamp()`，id 用 `insert_default=lambda: str(uuid4())`），并在 `__table_args__` 中按上述 Interfaces 声明约束与索引。在 `api/models/__init__.py` 加 `from .model_permission import AccountModelWhitelist` + `__all__` 追加
- [x] **Step 4: 跑测试通过**
- [x] **Step 5: Commit** — `git add api/models/model_permission.py api/models/__init__.py api/tests/unit_tests/models/test_model_permission.py && git commit -m "feat(model-permission): add AccountModelWhitelist model"`

### Task 2: Alembic 迁移（建表）

**Files:**
- Create: `api/migrations/versions/<timestamp>-<rev_id>_add_account_model_whitelist.py`
- 无单测（迁移用 `flask db check/upgrade` 在验证阶段人工验证，属集成范畴）

**Interfaces (Produces):** revision `<rev_id>`，down_revision 为当前 head（执行前 `flask db heads` 确认）

- [x] **Step 1: 获取当前 head** — `uv run --project api flask db heads` → 记录输出
- [x] **Step 2: 写迁移**（参照 `2026_08_26_1000-9f2c8d4e6a1b_add_department_management.py` 建表模式）：

```python
revision = "<rev_id>"
down_revision = "<current_head>"

def upgrade():
    op.create_table("account_model_whitelist",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
        sa.Column("account_id", models.types.StringUUID(), nullable=False),
        sa.Column("provider_name", sa.String(255), nullable=False),
        sa.Column("model_name", sa.String(255), nullable=False),
        sa.Column("model_type", sa.String(255), nullable=False),
        sa.Column("created_by", models.types.StringUUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="account_model_whitelist_pkey"),
        sa.UniqueConstraint("account_id", "provider_name", "model_name", "model_type", name="unique_account_model"),
    )
    with op.batch_alter_table("account_model_whitelist", schema=None) as batch_op:
        batch_op.create_index("account_model_whitelist_account_idx", ["account_id"], unique=False)
        batch_op.create_index("account_model_whitelist_tenant_idx", ["tenant_id"], unique=False)

def downgrade():
    op.drop_table("account_model_whitelist")
```

- [x] **Step 3: 校验迁移链与语法** — `uv run --project api flask db check`（旧版 Flask-Migrate 无该子命令时回退：`flask db heads` 确认新 revision 在链头）
- [x] **Step 4: Commit** — `feat(model-permission): add account_model_whitelist table migration`

---

## Milestone 2：Feature 1 — 模型权限控制后端

### Task 3: ModelPermissionService 核心（白名单 CRUD + 过滤）

**Files:**
- Create: `api/services/errors/model_permission.py`；Modify: `api/services/errors/__init__.py`（按现有导出模式追加）
- Create: `api/services/model_permission_service.py`
- Test: `api/tests/unit_tests/services/test_model_permission_service.py`

**Interfaces (Produces，全部 staticmethod，仿 DepartmentService 风格):**
```python
class ModelPermissionService:
    @staticmethod
    def get_whitelist(account_id: str) -> list[dict]: ...
        # 返回 [{provider_name, model_name, model_type}]，无记录返回 []
    @staticmethod
    def set_whitelist(tenant_id: str, account_id: str, models: list[dict],
                      created_by: str, operator_ip: str | None = None) -> dict: ...
        # models: [{provider_name, model_name, model_type}]
        # 空数组 → DELETE 所有记录（不限制）
        # 非空数组 → DELETE 旧记录 + INSERT 新记录
        # 返回 {"is_restricted": bool, "whitelist_count": int}
        # 审计日志：set_model_whitelist / remove_model_whitelist
    @staticmethod
    def get_filtered_models(account_id: str, tenant_id: str, model_type: str,
                            user: Account) -> list[ProviderWithModelsResponse]: ...
        # 专供 Task 6 的 model-types 端点：返回结构与 get_models_by_model_type 完全一致
        # owner/admin 或无白名单 → 直接透传 get_models_by_model_type(tenant_id, model_type) 原结果
        # 有白名单 → 对每个 ProviderWithModelsResponse.models 按 (provider, model, model_type) 过滤后重建响应
    @staticmethod
    def get_all_system_models(tenant_id: str) -> list[dict]: ...
        # 遍历 MODEL_TYPES = ("llm","text-embedding","rerank","speech2text","tts")
        # 对每个 type 调 ModelProviderService().get_models_by_model_type(tenant_id, type)
        # 拍平为 [{provider, model, model_type, label}]（供 Task 4/5 的管理与只读页面）
    @staticmethod
    def get_available_models_flat(account_id: str, tenant_id: str, user: Account) -> tuple[list[dict], bool]: ...
        # 供 Task 5"我的可用模型"页：调 get_all_system_models，非管理员且有白名单则过滤
        # 返回 (flattened_models, is_restricted)
    @staticmethod
    def is_restricted(account_id: str) -> bool: ...
        # EXISTS(SELECT 1 FROM account_model_whitelist WHERE account_id = ?)
```

错误类型：`ModelPermissionDeniedError(BaseServiceError)`、`InvalidModelError(BaseServiceError)`——控制器层捕获后 `abort(400/403, description=e.description)`。

**已验证的系统模型来源（执行前无需再 grep）：**
- 真实类为 `ModelProviderService`（`api/services/model_provider_service.py:23`），**非**设计文档写的 `ProviderModelService`
- 无 `get_all_models(tenant_id)` 方法。按模型类型取模型走 `get_models_by_model_type(tenant_id, model_type) -> list[ProviderWithModelsResponse]`（:385），返回结构 `ProviderWithModelsResponse.models` 为 `list[ModelWithProviderEntity]`（字段 `.model`、`.model_type`、`.provider.provider`、`.provider.label`）
- `set_whitelist` 校验模型合法性时：调 `ModelPermissionService.get_all_system_models(tenant_id)` 汇总成 `{(provider, model, model_type)}` 集合，请求中任一模型不在集合内 → `InvalidModelError`（400）

**有意偏离设计文档（Repository 层）：** 设计文档 §4.1 架构图画了 `AccountModelWhitelistRepository`，但本计划**不实现独立 Repository 层**，Service 直接用 `db.session.query(AccountModelWhitelist)`。理由：(1) `api/AGENTS.md` 明确"仅对超大表或需替代存储策略时才引入 repository 抽象"，本表为小配置表；(2) 直接先例 `DepartmentService`（`api/services/department_service.py`）全程 `db.session.query()` 无 Repository 层，保持一致性优先于遵循文档示意图。

- [x] **Step 1: 写失败测试**（`test_model_permission_service.py`，用 MagicMock 工厂模式，参照 `tests/unit_tests/services/test_department_service.py`；用 `app.test_request_context()` 提供 app context；mock `ModelProviderService.get_models_by_model_type` 提供系统模型）。用例：
  - `test_get_whitelist_empty_returns_empty_list`
  - `test_get_whitelist_returns_entries`
  - `test_set_whitelist_empty_deletes_all`
  - `test_set_whitelist_non_empty_replaces`
  - `test_set_whitelist_invalid_model_raises_error`
  - `test_get_filtered_models_admin_returns_all`（返回 ProviderWithModelsResponse 结构原样透传）
  - `test_get_filtered_models_no_whitelist_returns_all`
  - `test_get_filtered_models_with_whitelist_filters`（断言过滤后各 provider.models 仅含白名单项，且响应结构不变）
  - `test_get_available_models_flat_admin_returns_all_not_restricted`
  - `test_get_available_models_flat_whitelist_filters_and_marks_restricted`
  - `test_is_restricted_false_when_no_records`
  - `test_is_restricted_true_when_has_records`
  - `test_get_all_system_models_flattens_all_types`（mock 各 model_type 返回，断言拍平为 [{provider, model, model_type, label}]）
  - `test_audit_log_written_on_set_and_remove`
- [x] **Step 2: 跑测试确认失败** — `uv run --project api pytest tests/unit_tests/services/test_model_permission_service.py -v`
- [x] **Step 3: 实现 service + errors**
- [x] **Step 4: 跑测试通过**
- [x] **Step 5: Commit** — `feat(model-permission): add ModelPermissionService with whitelist CRUD and filtering`

### Task 4: 模型白名单管理 API（管理员）

**Files:**
- Create: `api/controllers/console/workspace/model_permission.py`
- Modify: `api/controllers/console/__init__.py`（import 块追加 `from .workspace import model_permission` 触发路由注册）
- Test: `api/tests/unit_tests/controllers/console/workspace/test_model_permission_api.py`

**Interfaces (Produces):**

| 类 | 路由 | 方法 | 权限 |
|---|---|---|---|
| `MemberModelWhitelistApi` | `/workspaces/current/members/<uuid:account_id>/model-whitelist` | GET / PUT | 仅 owner/admin |

GET 响应：
```json
{
  "is_restricted": true,
  "whitelist": [{"provider": "openai", "model": "gpt-4", "model_type": "llm"}],
  "all_system_models": [{"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "GPT-4"}]
}
```

PUT 请求体：
```json
{"models": [{"provider": "openai", "model": "gpt-4", "model_type": "llm"}]}
```

PUT 响应：
```json
{"result": "success", "is_restricted": true, "whitelist_count": 1}
```

控制器模式（照抄 members.py）：
```python
@console_ns.route("/workspaces/current/members/<uuid:account_id>/model-whitelist")
class MemberModelWhitelistApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, account_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can view model whitelist")

        whitelist = ModelPermissionService.get_whitelist(account_id)
        all_models = ModelPermissionService.get_all_system_models(tenant_id)
        return {
            "is_restricted": ModelPermissionService.is_restricted(account_id),
            "whitelist": whitelist,
            "all_system_models": all_models,
        }

    @setup_required
    @login_required
    @account_initialization_required
    def put(self, account_id):
        user, tenant_id = current_account_with_tenant()
        if not user.is_admin_or_owner:
            console_ns.abort(403, description="Only admin or owner can set model whitelist")

        payload = console_ns.payload or {}
        args = ModelWhitelistPayload.model_validate(payload)

        try:
            result = ModelPermissionService.set_whitelist(
                tenant_id=tenant_id,
                account_id=account_id,
                models=[{"provider_name": m.provider, "model_name": m.model, "model_type": m.model_type} for m in args.models],
                created_by=user.id,
                operator_ip=request.remote_addr,
            )
        except (InvalidModelError,) as e:
            console_ns.abort(400, description=str(e))

        return {"result": "success", **result}, 200
```

Pydantic payload：
```python
class ModelEntry(BaseModel):
    provider: str
    model: str
    model_type: str

class ModelWhitelistPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    models: list[ModelEntry]
```

- [x] **Step 1: 写失败测试**（controller 单测模式：`app.test_request_context` + `patch("...model_permission.current_account_with_tenant")`，参照 `test_members.py`；覆盖：GET 200 结构、GET 非 admin 403、PUT 设置成功 200、PUT 非 admin 403、PUT 无效模型 400）
- [x] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/controllers/console/workspace/test_model_permission_api.py -v`
- [x] **Step 3: 实现控制器**
- [x] **Step 4: 测试通过；并跑 `uv run --project api ruff check api/controllers/console/workspace/model_permission.py api/services/model_permission_service.py --fix`**
- [x] **Step 5: Commit** — `feat(model-permission): add model whitelist management APIs for admins`

### Task 5: 我的可用模型 API（用户只读）

**Files:**
- Create: `api/controllers/console/account/__init__.py`（新建子包，空文件即可）
- Create: `api/controllers/console/account/model_settings.py`
- Modify: `api/controllers/console/__init__.py`（新增 `# Import account controllers` 分组，追加 `from .account import model_settings`）
- Test: `api/tests/unit_tests/controllers/console/account/test_model_settings_api.py`

**注意：** `controllers/console/account/` 目录当前不存在（现有子包为 app/auth/billing/datasets/explore/tag/workspace）。需新建目录 + `__init__.py`。路由 `/account/model-settings` 经 Blueprint url_prefix 后完整路径为 `/console/api/account/model-settings`。

**Interfaces (Produces):**

| 类 | 路由 | 方法 | 权限 |
|---|---|---|---|
| `AccountModelSettingsApi` | `/account/model-settings` | GET | 已登录用户 |

GET 响应：
```json
{
  "available_models": [{"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "GPT-4"}],
  "is_restricted": true
}
```

- [x] **Step 1: 写失败测试**（GET 200 结构、owner/admin 返回全部模型且 is_restricted=false、普通用户有白名单返回过滤后列表且 is_restricted=true、普通用户无白名单返回全部模型且 is_restricted=false）
- [x] **Step 2: 确认失败**
- [x] **Step 3: 实现控制器**（调 `ModelPermissionService.get_available_models_flat(user.id, user.current_tenant_id, user)` 返回 `(models, is_restricted)`，直接组装响应 `{"available_models": models, "is_restricted": is_restricted}`）
- [x] **Step 4: 测试通过**
- [x] **Step 5: Commit** — `feat(model-permission): add read-only available models API for users`

### Task 6: 模型选择器后端单点过滤（覆盖全部前端选择器）

**已验证的唯一入口（执行前无需再 grep）：**
- 前端所有模型选择器统一走 Hook `useModelListByType(type)`（`web/service/use-common.ts:265`），请求 `GET /workspaces/current/models/model-types/<model_type>`
- 该端点后端实现为 `ModelProviderAvailableModelApi.get`（`api/controllers/console/workspace/models.py:527`），内部调 `ModelProviderService().get_models_by_model_type(tenant_id, model_type)`
- 另有 `model-provider-page/hooks.ts:147` 调同一端点（模型供应商设置页，管理员视角，不受白名单影响即可）

**结论：** 只需在后端这一个端点过滤，所有前端模型选择器（应用配置 / 工作流节点 / 知识库 embedding 等）自动生效，**前端无需任何改动**。

**Files:**
- Modify: `api/controllers/console/workspace/models.py:527-537`（`ModelProviderAvailableModelApi.get`）
- Test: `api/tests/unit_tests/controllers/console/workspace/test_model_available_filter.py`

**Interfaces (Consumes):** `ModelPermissionService.get_filtered_models(account_id, tenant_id, model_type, user)`

改造后实现：
```python
@console_ns.route("/workspaces/current/models/model-types/<string:model_type>")
class ModelProviderAvailableModelApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, model_type):
        user, tenant_id = current_account_with_tenant()
        models = ModelPermissionService.get_filtered_models(
            account_id=user.id, tenant_id=tenant_id, model_type=model_type, user=user
        )
        return jsonable_encoder({"data": models})
```

**注意：** `get_filtered_models` 返回结构须与 `get_models_by_model_type` 原返回（`list[ProviderWithModelsResponse]`）兼容，避免破坏前端既有渲染。实现时 `get_filtered_models` 内部：owner/admin 或无白名单直接透传 `get_models_by_model_type` 原结果；有白名单则对每个 `ProviderWithModelsResponse.models` 过滤后重建响应。

- [x] **Step 1: 写失败测试**（controller 单测：`app.test_request_context` + patch `current_account_with_tenant`；mock `ModelProviderService.get_models_by_model_type` 返回 2 个模型；用例：owner/admin 返回全部、普通用户有白名单仅返回白名单内、普通用户无白名单返回全部、白名单跨类型不误伤）
- [x] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/controllers/console/workspace/test_model_available_filter.py -v`
- [x] **Step 3: 实现**（改造 `ModelProviderAvailableModelApi.get`；`get_filtered_models` 保持返回结构兼容）
- [x] **Step 4: 测试通过 + 跑既有 models 端点回归** — `uv run --project api pytest tests/unit_tests/controllers/console/workspace/ -v -k model`
- [x] **Step 5: Commit** — `feat(model-permission): filter model-type endpoint by whitelist (single backend chokepoint)`

---

## Milestone 3：Feature 2 — 发布审批权限控制后端

### Task 7: AppPublishService 追加发布权限检查

**Files:**
- Modify: `api/services/app_publish_service.py`（追加 `_check_publish_permission` 私有函数 + 在 `update_published_departments`（:35）内调用）
- Test: `api/tests/unit_tests/services/test_app_publish_service.py`（追加权限矩阵用例）

**Interfaces (Produces):**
```python
def _check_publish_permission(user: Account, target_dept_id: str, tenant_id: str) -> None:
    """检查用户是否有权发布到目标部门"""
    user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)

    # 租户管理员：允许
    if user.is_admin_or_owner:
        return

    # 目标部门 == 用户部门：允许
    if target_dept_id == user_dept_id:
        return

    # 部门管理员：检查目标部门是否在管辖范围
    if DepartmentService.is_department_admin(user.id, tenant_id):
        user_dept = db.session.query(Department).filter_by(id=user_dept_id).first()
        if user_dept:
            # get_descendant_ids 仅返回后代，不含自身，需手动追加
            allowed_ids = DepartmentService.get_descendant_ids(tenant_id, user_dept_id)
            allowed_ids.append(user_dept_id)
            if target_dept_id in allowed_ids:
                return
        raise DepartmentPermissionDeniedError("部门管理员只能发布到管辖范围内的部门")

    # 普通用户：只能发布到本部门
    raise DepartmentPermissionDeniedError("普通用户只能发布到自己所属部门，如需跨部门发布请联系管理员")
```

在 `update_published_departments` 的 `enable_site` 校验后追加（含拒绝审计，设计文档 §11）：
```python
user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)

# 权限门控：任一目标部门越权即拒绝，并记录 publish_permission_denied
for dept_id in department_ids:
    try:
        _check_publish_permission(user, dept_id, tenant_id)
    except DepartmentPermissionDeniedError:
        DepartmentAuditLog.log(tenant_id, user.id, operator_ip, "publish_permission_denied",
                               {"app_id": app_id, "target_department_id": dept_id, "user_id": user.id})
        raise

# 审计日志：根据是否跨部门记录不同操作
if user.is_admin_or_owner or any(d != user_dept_id for d in department_ids):
    action = "publish_cross_department"
else:
    action = "publish_to_own_department"

DepartmentAuditLog.log(tenant_id, user.id, operator_ip, action,
                       {"app_id": app_id, "department_ids": department_ids})
```

注：目标方法为 `AppPublishService.update_published_departments(user, tenant_id, app_id, department_ids, operator_ip=None)`（`api/services/app_publish_service.py:35`，设计文档写的 `update_publish_departments` 方法名有误）。该签名已含 `user`/`tenant_id`/`app_id`/`operator_ip`，**无需改签名**。权限门控代码插在方法开头 `app.enable_site` 校验之后、diff 计算（`to_add`/`to_remove`）之前。

- [x] **Step 1: 写失败测试**（参数化测试矩阵）：
  - `test_owner_can_publish_to_any_department`
  - `test_admin_can_publish_to_any_department`
  - `test_dept_admin_can_publish_to_own_department`
  - `test_dept_admin_can_publish_to_subdepartment`
  - `test_dept_admin_cannot_publish_outside_scope`
  - `test_editor_can_publish_to_own_department_only`
  - `test_normal_can_publish_to_own_department_only`
  - `test_dataset_operator_can_publish_to_own_department_only`
  - `test_cross_department_publish_raises_403`
  - `test_audit_log_records_correct_action_type`（成功发布：own vs cross）
  - `test_audit_log_records_permission_denied`（越权发布被拒时写 `publish_permission_denied`，且原异常照常抛出）
- [x] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/services/test_app_publish_service.py -v -k publish`
- [x] **Step 3: 实现权限检查 + 审计日志**
- [x] **Step 4: 测试通过**
- [x] **Step 5: Commit** — `feat(publish-gate): add permission check and audit logging to app publish service`

### Task 8: 可发布部门列表 API（辅助前端）

**Files:**
- Modify: `api/controllers/console/app/publish_department.py`（追加新 Resource 类到现有文件，该文件已处理 GET/PUT `/apps/<uuid:app_id>/publish-departments` 路由）
- Test: `api/tests/unit_tests/controllers/console/app/test_publishable_departments_api.py`

**注意：** 不需要修改 `controllers/console/__init__.py`（`publish_department` 已在 line 64 注册）。

**关键 API 语义（`DepartmentService.get_accessible_department_ids`）：**
- 签名为 `get_accessible_department_ids(user: Any, tenant_id: str) -> list[str] | None`，第一参数是 **user 对象**（非 ID）
- 返回 `None`：admin/owner，不受限 → 对应 `publish_scope = "all"`
- 返回 `[]`：用户无部门 → 应返回空列表 + `publish_scope = "own_department_only"`
- 返回 `[dept_id, ...descendants]`：部门管理员 → 对应 `publish_scope = "department_and_subdepartments"`
- 返回 `[dept_id]`：普通成员 → 对应 `publish_scope = "own_department_only"`

**Interfaces (Produces):**

| 类 | 路由 | 方法 | 权限 |
|---|---|---|---|
| `AppPublishableDepartmentsApi` | `/console/api/apps/<uuid:app_id>/publishable-departments` | GET | 有编辑权限的用户 |

注：Flask-RESTx 通过 `console_ns.route()` 注册，实际完整路径为 `/console/api/apps/...`

GET 响应：
```json
{
  "departments": [
    {"id": "dept-uuid-1", "name": "技术部 > 前端组", "is_own_department": true},
    {"id": "dept-uuid-2", "name": "技术部 > 后端组", "is_own_department": false}
  ],
  "publish_scope": "department_and_subdepartments",
  "can_publish_cross_department": true
}
```

`publish_scope` 取值：`all`（租户管理员）、`department_and_subdepartments`（部门管理员）、`own_department_only`（普通用户）

- [x] **Step 1: 写失败测试**（GET 200 结构、owner 返回所有部门且 publish_scope=all、部门管理员返回管辖范围且 publish_scope=department_and_subdepartments、普通用户返回本部门且 publish_scope=own_department_only、无编辑权限 403）
- [x] **Step 2: 确认失败**
- [x] **Step 3: 实现控制器**（`current_account_with_tenant()` 取 user 对象，调 `DepartmentService.get_accessible_department_ids(user, tenant_id)` 按上述语义映射 publish_scope，再查 Department 表获取名称与路径拼接）
- [x] **Step 4: 测试通过**
- [x] **Step 5: Commit** — `feat(publish-gate): add publishable departments list API`

---

## Milestone 4：Feature 1 前端

### Task 9: oRPC 契约与数据 Hook（模型权限）

**Files:**
- Create: `web/contract/console/model_permissions.ts`（新领域独立文件；发布相关仍留在 `departments.ts`，不混放）
- Modify: `web/contract/router.ts`（挂 `modelPermissions` 路由）
- Create: `web/service/use-model-permissions.ts`
- Test: `web/__tests__/service/use-model-permissions.test.tsx`

**Interfaces (Produces):** 契约路由：
- `getMemberWhitelist`（GET `/workspaces/current/members/{account_id}/model-whitelist`）
- `setMemberWhitelist`（PUT `/workspaces/current/members/{account_id}/model-whitelist`）
- `getMyModelSettings`（GET `/account/model-settings`）

Hook：`useMemberModelWhitelist(accountId)`、`useSetMemberWhitelistMutation()`、`useMyModelSettings()`、`useInvalidateModelWhitelist()`

- [x] **Step 1: 写失败测试**（Vitest：契约 3 条路由参数化逐条断言 method/path/入参；queryKey 稳定性；`router.ts` 注册了新路由的断言）
- [x] **Step 2: 确认失败** — `pnpm test -- use-model-permissions`
- [x] **Step 3: 实现契约与 Hook**
- [x] **Step 4: `pnpm type-check && pnpm lint`**
- [x] **Step 5: Commit** — `feat(web/model-permission): oRPC contracts and query hooks`

### Task 10: 成员管理页面 — 模型权限入口与对话框

**Files:**
- Modify: `web/app/components/header/account-setting/members-page/index.tsx`（每成员行追加"模型权限"按钮，仅 owner/admin 可见）
- Create: `web/app/components/header/account-setting/members-page/model-whitelist-modal/index.tsx`
- Modify: i18n zh-Hans/en-US（`members.model_permission`、`model_whitelist.*` 平铺 key）
- Test: `web/__tests__/department/members-page-model-permission.test.tsx`

**交互逻辑:**
- 点击"模型权限" → 打开 Modal
- Modal 内容：复选框树（按提供商分组），首次打开无白名单则全选，有白名单则仅选中白名单模型
- 保存：调用 `setMemberWhitelist.mutateAsync({accountId, models})`
- 取消全选并保存 → 删除所有记录（用户回到"全部可用"）

- [x] **Step 1: 写失败测试**（RTL：渲染成员列表含"模型权限"按钮（admin 可见/普通成员隐藏）、Modal 打开后显示模型复选框、保存后调用 mutateAsync、取消全选保存后 models=[]）
- [x] **Step 2: 确认失败** — `pnpm test -- members-page-model-permission`
- [x] **Step 3: 实现**（复用 `@/app/components/base/ui/*` 的 Dialog/Checkbox）
- [x] **Step 4: `pnpm type-check && pnpm lint && pnpm test`**
- [x] **Step 5: Commit** — `feat(web/model-permission): add model whitelist modal in members page`

### Task 11: 我的可用模型页面（只读）

**Files:**
- Create: `web/app/components/header/account-setting/model-settings-page/index.tsx`
- Modify: `web/app/components/header/account-setting/constants.ts`（`ACCOUNT_SETTING_TAB` 加 `MODEL_SETTINGS = 'model_settings'`）
- Modify: `web/app/components/header/account-setting/index.tsx`（渲染区分支加 `<ModelSettingsPage />`）
- Modify: i18n zh-Hans/en-US（`settings.model_settings`、`my_available_models.*`）
- Test: `web/__tests__/department/model-settings-page.test.tsx`

**展示逻辑:**
- `is_restricted = false` → 显示"✅ 可使用所有系统模型"
- `is_restricted = true` → 显示"⚠️ 管理员已限制可用模型范围" + 按提供商分组的模型列表

- [x] **Step 1: 写失败测试**（RTL：受限状态文案正确、未受限状态文案正确、模型列表按提供商分组渲染）
- [x] **Step 2: 确认失败** — `pnpm test -- model-settings-page`
- [x] **Step 3: 实现**
- [x] **Step 4: type-check + lint + test**
- [x] **Step 5: Commit** — `feat(web/model-permission): add read-only my available models page`

---

## Milestone 5：Feature 2 前端

### Task 12: 发布对话框 — 部门选择器角色限制

**Files（路径已验证）:**
- Modify: `web/contract/console/departments.ts`（在现有 `publish-departments` 路由 :256/:266 附近追加 `publishableDepartments` GET `/apps/{id}/publishable-departments`）
- Modify: `web/service/use-departments.ts`（在 `usePublishDepartments` :180 附近追加 `usePublishableDepartments(appId)`）
- Modify: `web/app/components/app/overview/publish-department-modal/index.tsx`（部门选择器按 `publish_scope` 限制可选项）
- Modify: i18n zh-Hans/en-US（`publish.cross_department_locked`、`publish.own_department_only_hint` 等）
- Test: `web/__tests__/department/publish-dialog-role-restriction.test.tsx`

**交互逻辑:**
- 普通用户：其他部门选项 disabled + 🔒 图标 + tooltip "需管理员权限"
- 部门管理员：管辖范围外部门 disabled + 🔒 图标
- 租户管理员：所有部门可选

底部提示文案：
- 普通用户："ℹ️ 普通用户只能发布到自己部门。如需跨部门发布，请联系管理员。"
- 部门管理员：无额外提示
- 租户管理员：无额外提示

- [ ] **Step 1: 写失败测试**（RTL：mock 三角色分别渲染，断言 disabled 状态与提示文案正确；另加契约测试：`departments.ts` 新增 `publishableDepartments` 路由 method/path 断言）
- [ ] **Step 2: 确认失败** — `pnpm test -- publish-dialog-role-restriction`
- [ ] **Step 3: 实现**（先在 `departments.ts` 加 `publishableDepartments` 契约 + `use-departments.ts` 加 `usePublishableDepartments(appId)`；再在 modal 中调用该 Hook，按返回的 `publish_scope`（all / department_and_subdepartments / own_department_only）与各部门 `is_own_department` 决定选项 disabled 状态与提示文案）
- [ ] **Step 4: type-check + lint + test**
- [ ] **Step 5: Commit** — `feat(web/publish-gate): add role-based department selector restriction in publish dialog`

---

## Milestone 6：收尾验证

### Task 13: 全量回归与手动冒烟

- [ ] 后端：`make lint && make type-check && make test`
- [ ] 前端：`pnpm type-check && pnpm lint && pnpm test`
- [ ] 手动冒烟（本地 dev 环境）：
  1. 管理员设置成员 A 的白名单（仅 gpt-4）→ 成员 A 登录 → "我的可用模型"仅显示 gpt-4
  2. 成员 A 尝试在应用配置中选择其他模型 → 选择器不显示
  3. **边界场景**：成员 A 已有应用配置了 gpt-4o，管理员从白名单移除 gpt-4o → 应用配置保留且可运行，但模型选择器不再显示 gpt-4o
  4. 普通用户 B 尝试发布应用到其他部门 → 部门选择器中其他部门 disabled
  5. 部门管理员 C 尝试发布到管辖范围外部门 → 返回 403
  6. 租户管理员 D 发布到任意部门 → 成功
  7. **边界场景**：成员 E 从技术部移动到产品部 → 白名单不变，发布权限按新产品部计算
  8. **边界场景**：普通用户 F 直接调用 API 发布到其他部门 → 返回 403
- [ ] Commit（如有修复）— `fix(model-permission): polish after full verification`

---

## 遗留风险提示

- **白名单与系统新增模型**：管理员设置白名单后，若系统新增模型，新用户不可见（白名单是精确匹配）。需在 UI 提示管理员定期审查白名单。
- **已有应用配置的模型被移除**：应用配置中的模型保留（不强制修改），但模型选择器不再显示。应用仍可运行（选择时过滤，非运行时拦截）。
- **发布权限与部门移动**：用户被移动到新部门后，之前发布的记录保留，新部门发布权限按新部门计算。无需额外处理。
- **无 E2E 自动化**：仓库无 Playwright/Cypress workflow，白名单过滤全链路（管理员设白名单 → 用户选择器过滤）与发布权限门控仅靠组件/控制器级单测 + Task 13 手动冒烟；E2E 记 out-of-scope
- **本功能无全局开关**：与 M5 的 `DEPARTMENT_ACCESS_CONTROL_ENABLED` 不同，模型白名单与发布门控始终生效（无白名单=不限制、无发布记录=不可见，均向后兼容，无需开关）
