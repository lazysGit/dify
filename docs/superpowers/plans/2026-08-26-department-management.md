# 部门管理系统实施计划（Department Management）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Dify 社区版上实现租户内多级部门管理：部门树 CRUD 与移动、管理员手动创建成员（邮箱全局唯一，移除邀请制）、部门管理员体系、应用/知识库按部门隔离与转移、应用发布到部门的访问控制（探索过滤 + 聊天 URL 鉴权，带全局开关）。

**Architecture:** 新增 `departments` 表（path 物化路径 + level，10 级上限），扩展 `tenant_account_joins`（department_id、is_department_admin）、`apps`/`datasets`（department_id），M5 新增 `app_published_departments`。后端按现有 DDD 分层：Flask-RESTx Namespace 控制器 + Pydantic v2 payload → Service（DepartmentService/AppPublishService）→ ORM。数据隔离通过"可访问部门 ID 集合"辅助函数注入列表查询，通过 `assert_department_access` 守卫按 ID 直达的单资源入口。发布/聊天鉴权由 `DEPARTMENT_ACCESS_CONTROL_ENABLED`（默认 False）控制，关闭时行为与现状完全一致。

**Tech Stack:** Python Flask + SQLAlchemy(TypeBase/MappedAsDataclass) + Alembic + Flask-RESTx + Pydantic v2；前端 Next.js App Router + TS strict + TanStack Query + oRPC contract（`web/contract/console/`）+ Tailwind + base/ui 组件；测试 pytest（unit_tests，MagicMock 工厂模式）+ Vitest/RTL。

**Spec:** `docs/dm/dify-database-design-department.md`、`docs/dm/dify-department-system-architecture.md`、`docs/dm/dify-department-business-flow.md`、`docs/dm/dify-department-web-design.md`、`docs/dm/dify-department-access-control-design.md`

## Global Constraints

- 设计文档中的 `flask_restful + reqparse + api.add_resource` 代码样例已过时：**必须**用现有 Flask-RESTx `@console_ns.route()` + Pydantic v2 `model_validate(console_ns.payload)` 模式（参照 `api/controllers/console/workspace/members.py`）
- 迁移链 head 为 `6b5f9f8b1a2c`；M1 迁移 `down_revision = "6b5f9f8b1a2c"`，M5 迁移接在 M1 迁移之后
- uuid 一律用 `uuid_generate_v4()`（uuid-ossp 扩展已由 init 迁移 `64b051264f32_init.py:30` 启用，勿用 gen_random_uuid）
- path 格式：`/<tenant_id>/<根部门id>/<子部门id>/...`；根部门 level=1；层级上限 10
- 默认部门：每租户唯一（is_default=true）、不可删、可重命名、**不能作为父部门**、**不能移动**；新租户自动创建；数据迁移把存量成员/应用/知识库归入默认部门
- 部门名唯一性：同父部门下唯一；根部门（parent_id IS NULL）用 Postgres partial unique index 保证同租户唯一
- 部门管理员：仅 owner/admin/editor 角色可担任；只有租户管理员可设置/取消；移动部门或角色降级自动撤销并邮件通知租户管理员
- 邮箱全局唯一（跨租户）；**邀请制完全移除**，成员只能由管理员手动创建
- 部门管理员创建成员仅可选 editor/normal/dataset_operator；部门管理员不能移出自己
- 角色-可见范围铁律：owner/admin→全部部门；部门管理员→本部门+子孙部门；其他→仅本部门
- 审计日志统一写 `OperationLog`（`api/models/model.py:1918`），service 层经 `DepartmentAuditLog.log(tenant_id, operator_id, ip, action, content)` 落库，ip 由控制器传 `request.remote_addr`
- 后端：`uv run --project api`；Ruff 120 字符双引号；文件 <800 行；所有查询带 tenant_id；服务层错误继承 `services/errors/base.py::BaseServiceError`，新领域错误放 `api/services/errors/department.py`
- 前端：`pnpm`；`no-explicit-any: error`；新服务调用走 `web/contract/console/` oRPC 契约 + `consoleQuery`；i18n key 平铺排序，只加 `zh-Hans` 与 `en-US`（其余语言由 CI 翻译流程补齐，既有惯例）；UI 用 `@/app/components/base/ui/*`（AlertDialog/toast），不用 deprecated 的 Confirm/ToastContext
- 每个任务结束跑对应测试并 commit（conventional commits：`feat(scope): ...`）；**U6：后端任务 commit 前对 touched 文件跑 `uv run --project api ruff check --fix`（不只 Task 5 记得跑）**
- M1-M4 的部门隔离与成员管理不依赖功能开关，始终生效；`DEPARTMENT_ACCESS_CONTROL_ENABLED` 仅控制 M5 的探索发布过滤与聊天鉴权

---

## Milestone 1：数据库层（模型 + 迁移）

### Task 1: Department 模型与注册

**Files:**
- Create: `api/models/department.py`
- Modify: `api/models/__init__.py`（import + `__all__`）
- Test: `api/tests/unit_tests/models/test_department.py`

**Interfaces (Produces):**
- `class Department(TypeBase)`，表 `departments`，字段：`id: StringUUID`、`tenant_id: StringUUID`、`parent_id: StringUUID | None`、`name: str`（String(255)）、`description: str | None`（LongText）、`path: str`（String(1000)）、`level: int = 1`、`sort_order: int = 0`、`is_default: bool = False`、`created_by: StringUUID`、`created_at/updated_at: datetime`、`updated_by: StringUUID | None`
- M5 复用：`class AppPublishedDepartment(TypeBase)`，表 `app_published_departments`（Task 18 再建）
- 约束：`PrimaryKeyConstraint("id", name="department_pkey")`；`UniqueConstraint("tenant_id","parent_id","name", name="unique_tenant_department_name")`；partial unique index `unique_tenant_root_department_name`（`postgresql_where=sa.text("parent_id IS NULL")`）；**partial unique index `unique_tenant_default_department`（`tenant_id`，`postgresql_where=sa.text("is_default")`，R6：DB 层保证每租户至多一个默认部门）**；索引 `department_tenant_idx`、`department_parent_idx`、`department_path_idx`

- [ ] **Step 1: 写失败测试**（验证表名、列、约束存在）：

```python
# api/tests/unit_tests/models/test_department.py
from models.department import Department


def test_department_tablename_and_columns():
    assert Department.__tablename__ == "departments"
    cols = Department.__table__.columns.keys()
    for expected in ("id", "tenant_id", "parent_id", "name", "description", "path",
                     "level", "sort_order", "is_default", "created_by", "created_at", "updated_at", "updated_by"):
        assert expected in cols


def test_department_root_name_unique_index():
    idx = {i.name for i in Department.__table__.indexes}
    assert "unique_tenant_root_department_name" in idx
    assert "unique_tenant_default_department" in idx  # T5
    assert "department_path_idx" in idx
    assert "department_tenant_idx" in idx  # T5
    assert "department_parent_idx" in idx  # T5
    assert "unique_tenant_department_name" in {c.name for c in Department.__table__.constraints}  # T5
```

- [ ] **Step 2: 跑测试确认失败** — `uv run --project api pytest tests/unit_tests/models/test_department.py -v` → FAIL（模块不存在）
- [ ] **Step 3: 实现模型** — 新建 `api/models/department.py`，完全仿照 `api/models/account.py:274` 的 `TenantAccountJoin(TypeBase)` 写法（MappedAsDataclass，`StringUUID` from `models.types`，created_at/updated_at 用 `server_default=func.current_timestamp()`，id 用 `insert_default=lambda: str(uuid4())`），并在 `__table_args__` 中按上述 Interfaces 声明约束与索引。在 `api/models/__init__.py` 加 `from .department import Department` + `__all__` 追加
- [ ] **Step 4: 跑测试通过**
- [ ] **Step 5: Commit** — `git add api/models/department.py api/models/__init__.py api/tests/unit_tests/models/test_department.py && git commit -m "feat(department): add Department model"`

### Task 2: 扩展现有模型字段

**Files:**
- Modify: `api/models/account.py:274-298`（TenantAccountJoin 加 2 列）
- Modify: `api/models/model.py:349-381`（App 加 1 列）
- Modify: `api/models/dataset.py:117-162`（Dataset 加 1 列）
- Test: `api/tests/unit_tests/models/test_department.py`（追加）

**Interfaces (Produces):** `TenantAccountJoin.department_id: StringUUID | None`（index `tenant_account_join_department_id_idx`）、`TenantAccountJoin.is_department_admin: bool = False`（server_default false）、`App.department_id: StringUUID | None`（index `app_department_id_idx`）、`Dataset.department_id: StringUUID | None`（index `dataset_department_id_idx`）

- [ ] **Step 1: 追加失败测试**（断言四张表各自包含新列名；**T5 追加：断言三张表新列索引名 `tenant_account_join_department_id_idx`/`app_department_id_idx`/`dataset_department_id_idx` 存在、`is_department_admin` 列 server_default 为 false**）
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 加列**（MappedAsDataclass 写法：`department_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True, default=None)`；`is_department_admin: Mapped[bool] = mapped_column(sa.Boolean, server_default=sa.text("false"), default=False)`；各自在 `__table_args__` 加 `sa.Index`）
- [ ] **Step 4: 跑 M1 全部模型测试通过** — `uv run --project api pytest tests/unit_tests/models/ -v`
- [ ] **Step 5: Commit** — `feat(department): add department_id/is_department_admin columns`

### Task 3: Alembic 迁移（建表 + 加列 + 存量数据迁移）

**Files:**
- Create: `api/migrations/versions/2026_08_26_1000-9f2c8d4e6a1b_add_department_management.py`
- 无单测（迁移用 `flask db check/upgrade` 在验证阶段人工验证，属集成范畴）

**Interfaces (Produces):** revision `"9f2c8d4e6a1b"`，down_revision `"6b5f9f8b1a2c"`

- [ ] **Step 1: 写迁移**（参照 `2026_01_17_1110-f9f6d18a37f9` 建表 + `2026_03_04_1600-6b5f9f8b1a2c` 加列模式）：

```python
revision = "9f2c8d4e6a1b"
down_revision = "6b5f9f8b1a2c"

def upgrade():
    op.create_table("departments",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
        sa.Column("parent_id", models.types.StringUUID(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", models.types.LongText(), nullable=True),
        sa.Column("path", sa.String(1000), nullable=False),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_by", models.types.StringUUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column("updated_by", models.types.StringUUID(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="department_pkey"),
        sa.UniqueConstraint("tenant_id", "parent_id", "name", name="unique_tenant_department_name"),
    )
    with op.batch_alter_table("departments", schema=None) as batch_op:
        batch_op.create_index("department_tenant_idx", ["tenant_id"], unique=False)
        batch_op.create_index("department_parent_idx", ["parent_id"], unique=False)
        batch_op.create_index("department_path_idx", ["path"], unique=False)
        batch_op.create_index("unique_tenant_root_department_name", ["tenant_id", "name"],
                              unique=True, postgresql_where=sa.text("parent_id IS NULL"))
        batch_op.create_index("unique_tenant_default_department", ["tenant_id"],
                              unique=True, postgresql_where=sa.text("is_default"))
    for table, idx in (("tenant_account_joins", "tenant_account_join_department_id_idx"),
                       ("apps", "app_department_id_idx"), ("datasets", "dataset_department_id_idx")):
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.add_column(sa.Column("department_id", models.types.StringUUID(), nullable=True))
            batch_op.create_index(idx, ["department_id"], unique=False)
    with op.batch_alter_table("tenant_account_joins", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_department_admin", sa.Boolean(),
                                      server_default=sa.text("false"), nullable=False))

    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO departments (id, tenant_id, parent_id, name, path, level, is_default, created_by, created_at, updated_at)
        SELECT uuid_generate_v4(), t.id, NULL, '默认部门', '/' || t.id::text || '/' || uuid_generate_v4()::text, 1, true,
               (SELECT taj.account_id FROM tenant_account_joins taj WHERE taj.tenant_id = t.id
                 ORDER BY taj.created_at LIMIT 1), NOW(), NOW()
        FROM tenants t
        WHERE EXISTS (SELECT 1 FROM tenant_account_joins taj WHERE taj.tenant_id = t.id)
    """))
    conn.execute(sa.text("UPDATE departments SET path = '/' || tenant_id::text || '/' || id::text WHERE is_default = true"))
    for table in ("tenant_account_joins", "apps", "datasets"):
        conn.execute(sa.text(f"""
            UPDATE {table} x SET department_id = d.id FROM departments d
            WHERE d.tenant_id = x.tenant_id AND d.is_default = true AND x.department_id IS NULL
        """))

def downgrade():
    op.drop_table("departments")
    with op.batch_alter_table("tenant_account_joins", schema=None) as batch_op:
        batch_op.drop_column("is_department_admin")
        batch_op.drop_column("department_id")
    for table in ("apps", "datasets"):
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_column("department_id")
```

- [ ] **Step 2: 校验迁移链与语法** — `uv run --project api flask db check`（旧版 Flask-Migrate 无该子命令时回退：`flask db heads` 确认新 revision 在链头，再跑 autogenerate `flask db migrate --rev-id 9f2c8d4e6a1b -m "add department management" --head 9f2c8d4e6a1b` 比对差异确保无遗漏）。**T8 迁移 CI 对齐**：本地跑 `flask db upgrade --sql`（offline 模式）验证回填语句可编译——`db-migration-test.yml` 会跑 offline `--sql` 与 MySQL upgrade，若 `conn.execute(sa.text(...))` 在 offline/MySQL 下失败，回填需改为 `op.execute()` 兼容形式；`postgresql_where` partial index（`unique_tenant_root_department_name`/`unique_tenant_default_department`）在 MySQL 分支条件跳过（参照现有迁移的 `_is_pg(conn)` 模式）。
- [ ] **Step 3: 迁移后验证（G5）** — 在集成/冒烟环境 `flask db upgrade` 后执行验证 SQL（照 DB 设计 L276-299，断言每租户恰 1 个默认部门、四表 department_id 回填完整）：
```sql
SELECT 'departments' t, COUNT(*) n, SUM(CASE WHEN is_default THEN 1 ELSE 0 END) default_count FROM departments
UNION ALL SELECT 'taj', COUNT(*), SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) FROM tenant_account_joins
UNION ALL SELECT 'apps', COUNT(*), SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) FROM apps
UNION ALL SELECT 'datasets', COUNT(*), SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) FROM datasets;
-- 期望：每个租户 default_count=1；taj/apps/datasets 的 non-null 数 = 各自总数
-- T8 追加 path 格式校验（期望 0 行）：
SELECT id FROM departments WHERE is_default AND path <> '/' || tenant_id::text || '/' || id::text;
```
**G9 偏离注释（写入迁移文件头注释）：** 默认部门回填仅覆盖"有成员的租户"（`WHERE EXISTS`）——空租户无成员可作 `created_by`（NOT NULL），且其默认部门由 Task 5 的惰性创建兜底。
- [ ] **Step 4: Commit** — `feat(department): add departments table migration with data backfill`

---

## Milestone 2：部门/成员后端

### Task 4: DepartmentService 核心（树/CRUD/权限判定/审计）

**Files:**
- Create: `api/services/errors/department.py`；Modify: `api/services/errors/__init__.py`（按现有导出模式追加）
- Create: `api/services/department_service.py`（含 `DepartmentAuditLog` 辅助类，超 800 行时拆 `department_audit.py`）
- Test: `api/tests/unit_tests/services/test_department_service.py`

**Interfaces (Produces，全部 staticmethod，仿 AccountService 风格):**
```python
class DepartmentAuditLog:
    @staticmethod
    def log(tenant_id: str, operator_id: str, operator_ip: str | None, action: str, content: dict) -> None: ...
        # 写 OperationLog(model.py:1918)，created_ip 缺省 "0.0.0.0"
    @staticmethod
    def query(tenant_id: str, key: str, value: str, limit: int = 100) -> list[OperationLog]: ...
        # G2 审计读取：按 OperationLog.content JSON 字段检索，如 content->>'department_id' == value 或 content->>'account_id' == value。
        # 注意：真实 OperationLog 表（model.py:1918-1942）无 target_id 列，设计文档 L905-926 的样例代码基于旧表结构，
        # 此处按实际表结构修正——content 已写入 department_id/account_id/name 等键。
        # 实现用 sa 的 JSON 字段访问（sqlalchemy JSON cast text）+ tenant_id + created_at 倒序。

class DepartmentService:
    MAX_DEPTH = 10
    @staticmethod
    def get_default_department(tenant_id: str) -> Department: ...            # 无则抛 NotFound
    @staticmethod
    def create_default_department(tenant_id: str, created_by: str) -> Department: ...
    @staticmethod
    def create_department(tenant_id: str, name: str, created_by: str,
                          parent_id: str | None = None, description: str | None = None,
                          operator_ip: str | None = None) -> Department: ...
    @staticmethod
    def update_department(tenant_id: str, department_id: str, updated_by: str,
                          name: str | None = None, description: str | None = None,
                          operator_ip: str | None = None) -> Department: ...
    @staticmethod
    def delete_department(tenant_id: str, department_id: str, operator_ip: str | None = None) -> None: ...
    @staticmethod
    def get_departments_with_counts(tenant_id: str) -> list[dict]: ...       # 含 member_count/app_count/dataset_count
    @staticmethod
    def build_tree(departments: list[dict]) -> list[dict]: ...               # children 嵌套
    @staticmethod
    def get_descendant_ids(tenant_id: str, department_id: str) -> list[str]: ...  # path LIKE 'path/%'
    @staticmethod
    def get_user_department_id(account_id: str, tenant_id: str) -> str | None: ...
    @staticmethod
    def is_department_admin(account_id: str, tenant_id: str) -> bool: ...
    @staticmethod
    def get_accessible_department_ids(user: Account, tenant_id: str) -> list[str] | None: ...
        # owner/admin→None(不限)；部门管理员→[本部门]+子孙；其他→[本部门]
    @staticmethod
    def get_manageable_department_ids(user: Account, tenant_id: str) -> list[str]: ...  # 供筛选标签/选择器（成员可管理=本部门）
    @staticmethod
    def resolve_department_id_for_creation(user: Account, tenant_id: str,
                                           requested_department_id: str | None) -> str: ...
    @staticmethod
    def assert_department_access(user: Account, tenant_id: str, resource_department_id: str | None,
                                 resource_tenant_id: str | None = None) -> None: ...  # Task 7 用；I1：resource_tenant_id 显式校验跨租户
    @staticmethod
    def resource_department_filter(resource_model, tenant_id: str, accessible: list[str]) -> ...:
        # 列表过滤统一语义：coalesce(resource.department_id, 默认部门id).in_(accessible)
        # 关键：多生产路径（DSL 导入/应用复制/workflow 转换/external knowledge/RAG pipeline/annotation 等）
        # 绕过 create_app/create_dataset 会产生 department_id=NULL 的行，若用裸 in_(accessible) 会对非管理员隐身。
        # 与 assert_department_access 的 "NULL→默认部门" 兜底保持一致。
        return func.coalesce(resource_model.department_id, DepartmentService.get_default_department(tenant_id).id).in_(accessible)
```
错误类型：`DepartmentNotFoundError(BaseServiceError)`、`DepartmentValidationError(BaseServiceError)`、`DepartmentPermissionDeniedError(BaseServiceError)`——控制器层捕获后 `abort(400/404/403, description=e.description)`。

核心算法（写进实现）：
```python
@staticmethod
def create_department(tenant_id, name, created_by, parent_id=None, description=None, operator_ip=None):
    parent = None
    if parent_id:
        parent = db.session.query(Department).filter(
            Department.id == parent_id, Department.tenant_id == tenant_id).first()
        if not parent:
            raise DepartmentNotFoundError("Parent department not found")
        if parent.is_default:
            raise DepartmentValidationError("默认部门不能有子部门")
        if parent.level >= DepartmentService.MAX_DEPTH:
            raise DepartmentValidationError("部门层级不能超过 10 级")
    dup = db.session.query(Department).filter(
        Department.tenant_id == tenant_id,
        Department.parent_id.is_(parent_id),
        Department.name == name).first()
    if dup:
        raise DepartmentValidationError("同级下已存在同名部门")
    department = Department(tenant_id=tenant_id, parent_id=parent_id, name=name,
                            description=description, level=(parent.level + 1) if parent else 1,
                            is_default=False, created_by=created_by)
    db.session.add(department)
    db.session.flush()
    prefix = parent.path if parent else f"/{tenant_id}"
    department.path = f"{prefix}/{department.id}"
    db.session.commit()
    DepartmentAuditLog.log(tenant_id, created_by, operator_ip, "create_department",
                           {"department_id": department.id, "name": name, "parent_id": parent_id})
    return department
```
`delete_department` 依序检查（**I8 可扩展检查列表模式**：用 `_delete_pre_checks = [("is_default", ...), ("children", ...), ("members", ...), ("apps", ...), ("datasets", ...)]` 列表，Task 19 追加第 5 项只需 append 一个 tuple，无需改核心循环；任一 >0 抛 ValidationError 中文消息带数量）：`is_default` → 子部门数（`parent_id == id`）→ 成员数（TenantAccountJoin）→ apps 数 → datasets 数。Task 19 将追加第 5 项（app_published_departments 指向本部门的发布记录）。**`get_departments_with_counts` 的 app_count/dataset_count 聚合必须与列表过滤同用 coalesce 语义（见下方），否则默认部门计数与列表可见性不一致。** `get_accessible_department_ids`：

```python
@staticmethod
def get_accessible_department_ids(user, tenant_id):
    if user.is_admin_or_owner:
        return None
    dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
    if not dept_id:
        return []
    if DepartmentService.is_department_admin(user.id, tenant_id):
        return [dept_id, *DepartmentService.get_descendant_ids(tenant_id, dept_id)]
    return [dept_id]
```
`assert_department_access`（NULL 资源部门按默认部门兜底）：
```python
@staticmethod
def assert_department_access(user, tenant_id, resource_department_id):
    accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
    if accessible is None:
        return
    dept_id = resource_department_id or DepartmentService.get_default_department(tenant_id).id
    if dept_id not in accessible:
        raise DepartmentPermissionDeniedError("无权访问该资源")
```

- [ ] **Step 1: 写失败测试**（`test_department_service.py`，用 MagicMock 工厂模式，参照 `tests/unit_tests/services/test_account_service.py` 的 `TestAccountAssociatedDataFactory` + `ServiceDbTestHelper`；用 `app.test_request_context()` 提供 app context）。用例：
  - `test_create_department_root_builds_path`：mock db 查询返回 None（无重名、无父），flush 后 id="d1"，断言 path == `"/t1/d1"`、level==1
  - `test_create_department_rejects_default_parent`
  - `test_create_department_rejects_depth_over_10`
  - `test_create_department_rejects_duplicate_name`（含 parent_id 为 None 用 `is_(None)` 匹配）
  - `test_delete_department_blocked_by_children/members/apps/datasets`（四参数化）
  - `test_delete_default_department_rejected`
  - `test_get_accessible_department_ids_admin_returns_none`
  - `test_get_accessible_department_ids_dept_admin_returns_descendants`
  - `test_get_accessible_department_ids_member_returns_own_only`
  - `test_get_departments_with_counts_aggregates`（mock 三个 count 查询；**T5 追加断言聚合与列表过滤同用 coalesce，防止"计数裸 in_ 与列表 coalesce 不一致"回归**）
  - `test_update_department_renames_and_checks_duplicate`（T5：重命名成功/同级重名 400/默认部门可重命名）
  - `test_build_tree_nested`（T5：多级父子嵌套与排序）
  - `test_get_descendant_ids_path_prefix`（T5：path LIKE 前缀匹配，含隔代）
  - `test_get_manageable_department_ids_matrix`（T5：admin=全部/部门管理员=范围/普通成员=本部门）
  - `test_create_default_department_retries_on_integrity_error`（R6：抛 IntegrityError 后重查返回已存在行，不产生重复默认部门）
  - `test_audit_log_written_on_create_and_delete`
  - `test_audit_query_by_department_and_member`（G2：按 content JSON 的 department_id/account_id 检索返回对应 OperationLog，tenant 过滤生效）
- [ ] **Step 2: 跑测试确认失败** — `uv run --project api pytest tests/unit_tests/services/test_department_service.py -v`
- [ ] **Step 3: 实现 service + errors + audit helper**
- [ ] **Step 4: 跑测试通过**
- [ ] **Step 5: Commit** — `feat(department): add DepartmentService with tree CRUD, scope helpers and audit`

### Task 5: 新租户默认部门钩子 + 部门 CRUD 控制器

**Files:**
- Modify: `api/services/account_service.py:1017-1050`（`TenantService.create_tenant` 末尾调 `DepartmentService.create_default_department`——先查存在性（幂等），import 放函数内避免循环导入）

> **R6 并发兜底：** `DepartmentService.create_default_department` 的 get_or_create 需捕获 `IntegrityError`（partial unique index `unique_tenant_default_department` 触发）后重查返回已存在行，防止并发登录/建租户竞态产生重复默认部门。
- Modify: `api/services/account_service.py:1083-1100`（`create_tenant_member(tenant, account, role, department_id: str | None = None)`：未传 department_id 时**惰性**落默认部门——`dept = get_default_department(...)`，查不到就 `create_default_department`，**不要抛错**；传入时赋给 join 的 `department_id`，**含 :1090-1095 的 ta 复用分支同样更新**。该方法是 oauth/login/forgot_password/inner_api 6 个调用点的唯一收口，滚动部署窗口期/企业工具直建租户/测试直插数据时可能无默认部门，抛错会 500 登录路径；惰性创建保证无 NULL 部门 join 且不炸）
- Create: `api/controllers/console/workspace/department.py`
- Modify: `api/controllers/console/__init__.py:124-136`（import 块追加 `from .workspace import department` 触发路由注册）
- Test: `api/tests/unit_tests/controllers/console/workspace/test_department_api.py`

**Interfaces (Produces):**

| 类 | 路由 | 方法 | 权限 |
|---|---|---|---|
| `DepartmentListApi` | `/workspaces/current/departments` | GET（树+计数+`manageable_department_ids`+`is_department_admin`）/ POST（创建） | GET 所有登录成员；POST 仅 owner/admin |
| `DepartmentApi` | `/departments/<uuid:department_id>` | PUT / DELETE | 仅 owner/admin |
| `DepartmentMemberApi` | `/departments/<uuid:department_id>/members` | GET / PUT（移动成员） | GET：owner/admin、范围内部门管理员、**本部门普通成员**均可见（对齐架构文档），返回体含 `can_set_admin`；PUT：owner/admin 或范围内部门管理员 |
| `DepartmentAdminApi` | `/departments/<uuid:department_id>/admins` | POST / DELETE | 仅 owner/admin |
| `DepartmentOperationLogApi` | `/departments/<uuid:department_id>/operation-logs` | GET（G2 审计查询） | 仅 owner/admin；返回 `{logs: [{id, action, content, created_at, created_ip}]}`，limit 默认 100 |

审计查询端点实现：`DepartmentAuditLog.query(tenant_id, "department_id", department_id, limit)`；query 参数 `limit`（1-100）校验。

响应元素 `is_department_admin: bool` 为**当前用户视角**的部门管理员标记（前端据此显隐部门 Tab 与成员页创建按钮——`useCurrentWorkspace()` 只返回 role，成员列表对普通成员 403，不能靠遍历成员找自己；普通成员该值为 false）。

控制器模式（照抄 members.py）：

```python
@console_ns.route("/workspaces/current/departments")
class DepartmentListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        user, tenant_id = current_account_with_tenant()
        departments = DepartmentService.get_departments_with_counts(tenant_id)
        return {"departments": departments,
                "tree": DepartmentService.build_tree(departments),
                "manageable_department_ids": DepartmentService.get_manageable_department_ids(user, tenant_id)}
```

POST/PUT 用 Pydantic payload（`class DepartmentCreatePayload(BaseModel): model_config = ConfigDict(extra="forbid"); name: str; parent_id: str | None = None; description: str | None = None`，uuid 校验用 `field_validator`）。统一异常翻译：`DepartmentNotFoundError→404`、`DepartmentValidationError→400`、`DepartmentPermissionDeniedError→403`（`console_ns.abort(code, description=e.description)`），服务方法传 `operator_ip=request.remote_addr`。

- [ ] **Step 1: 写失败测试**（controller 单测模式：`app.test_request_context` + `patch("...department.current_account_with_tenant")`，参照 `test_members.py`；覆盖（含 T3 控制器层补齐）：GET 200 结构（含 `is_department_admin` 字段）、POST 创建 201、POST 非 admin 403、POST 重名 400、DepartmentApi PUT 200 / 非 admin 403、DELETE 默认部门 400、DepartmentMemberApi GET 本部门普通成员 200 / 他部门普通成员 403、**DepartmentMemberApi PUT 权限矩阵（owner 放行 / 范围内部门管理员放行 / 越界 403 / 部门管理员移自己 400）**、**DepartmentAdminApi POST/DELETE 200 / 非 owner 403**、**DepartmentOperationLogApi 200/非 owner 403/limit 越界 400（G2/T3）**、**create_tenant 钩子幂等（重复调用不重复建默认部门，T3）**；另在 `test_account_service.py` 补 `create_tenant_member` 两条：无默认部门时惰性创建不抛错、显式传 department_id 优先）
- [ ] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/controllers/console/workspace/test_department_api.py -v`
- [ ] **Step 3: 实现控制器 + create_tenant/create_tenant_member 钩子**
- [ ] **Step 4: 测试通过；并跑 `uv run --project api ruff check api/controllers/console/workspace/department.py api/services/department_service.py --fix` + **T9 回归**：`uv run --project api pytest tests/unit_tests/services/test_account_service.py -v`（本任务改了 create_tenant/create_tenant_member）**
- [ ] **Step 5: Commit** — `feat(department): department CRUD APIs and default department on tenant/member creation`

### Task 6: 部门移动 move_department

**Files:**
- Modify: `api/services/department_service.py`
- Modify: `api/controllers/console/workspace/department.py`（`PUT /departments/<uuid:department_id>/move`，payload `{parent_id: str | None}`，仅 owner/admin）
- Test: `api/tests/unit_tests/services/test_department_move.py`、`api/tests/unit_tests/controllers/console/workspace/test_department_move_api.py`（T3：控制器层用例）

**Interfaces (Produces):** `DepartmentService.move_department(tenant_id, department_id, new_parent_id, operator_id, operator_ip) -> None`（new_parent_id 为 NULL 表示移为根）

规则：默认部门不可移动；新父不得是自身或自身子孙（`new_parent.path.startswith(department.path)` 即拒绝）；深度校验 `new_parent.level + 1 + (max_level_in_subtree - department.level) <= 10`；新父是默认部门→拒绝；单事务内级联更新 path/level：

```python
old_prefix, new_prefix = department.path, f"{(new_parent.path if new_parent else '/' + tenant_id)}/{department.id}"
db.session.execute(sa.update(Department)
    .where(Department.path.like(old_prefix + "%"))
    .values(path=func.replace(Department.path, old_prefix, new_prefix),
            level=Department.level + level_diff, updated_at=func.now()))
db.session.execute(sa.update(Department).where(Department.id == department_id)
    .values(parent_id=new_parent_id))
DepartmentAuditLog.log(tenant_id, operator_id, operator_ip, "move_department",
                       {"department_id": department_id, "old_path": old_prefix, "new_path": new_prefix})
```

- [ ] **Step 1: 写失败测试**：`test_move_to_root`、`test_move_subtree_updates_path_and_level`（path 前缀替换 + level 偏移）、`test_move_rejects_cycle`（移入自身子孙）、`test_move_rejects_depth_exceeded`、`test_move_rejects_default_department`、`test_move_into_default_department_rejected`、`test_audit_log_written`；控制器层（T3）：`test_move_endpoint_200_admin`、`test_move_endpoint_403_non_admin`、`test_move_endpoint_400_payload`（非法 parent_id/越界父部门）
- [ ] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/services/test_department_move.py tests/unit_tests/controllers/console/workspace/test_department_move_api.py -v`
- [ ] **Step 3: 实现 service + 控制器**
- [ ] **Step 4: 测试通过**
- [ ] **Step 5: Commit** — `feat(department): move department with path/level cascade`

### Task 7: 单资源访问守卫（按 ID 直达防护）

**Files:**
- Modify: `api/controllers/console/app/wraps.py:31`（`get_app_model`）
- **C1：Dataset 侧无集中式加载装饰器（与 app 侧不同）**——datasets 目录下 30+ 端点均内联调用 `DatasetService.get_dataset` + `check_dataset_permission`。**方案：在 `DatasetService.check_dataset_permission` 末尾追加 `assert_department_access` 调用**（最小改动，无需创建新装饰器或改全部端点）。需修改：`api/services/dataset_service.py` 的 `check_dataset_permission` 方法
- Modify: `api/controllers/console/datasets/` 下端点无需逐个改（service 层统一拦截）
- Modify: `api/services/department_service.py`（`assert_department_access` 已在 Task 4 定义）
- Test: `api/tests/unit_tests/controllers/console/app/test_department_access_guard.py`、`api/tests/unit_tests/services/test_dataset_department_guard.py`（**C1 新增**：dataset service 层守卫用例）

**Interfaces (Consumes):** `DepartmentService.assert_department_access(user, tenant_id, resource_department_id)`

**行为:** 在 `get_app_model`（app 侧全部 console 单应用资源的唯一入口：详情/更新/删除/模型配置/workflow 等）加载模型后、视图执行前调用；**dataset 侧在 `DatasetService.check_dataset_permission` 内调用**（C1：service 层统一拦截，避免改 30+ 端点）：

```python
# app 侧（wraps.py get_app_model 内）
DepartmentService.assert_department_access(current_user, current_user.current_tenant_id, app.department_id)

# dataset 侧（dataset_service.py check_dataset_permission 末尾）
DepartmentService.assert_department_access(user, user.current_tenant_id, dataset.department_id)
```

**I1 跨租户防护（必须）：** `get_app_model` 不过滤 tenant_id，`assert_department_access` 对 admin 返回 None（不限部门）时**不检查 tenant_id**。为防 admin 用户通过 app_id 加载其他租户 app，在 `assert_department_access` 开头追加显式 tenant 校验：

```python
@staticmethod
def assert_department_access(user, tenant_id, resource_department_id, resource_tenant_id=None):
    # I1: 显式校验资源归属租户，防止跨租户访问
    if resource_tenant_id and resource_tenant_id != tenant_id:
        raise DepartmentPermissionDeniedError("无权访问该资源")
    accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
    if accessible is None:
        return
    dept_id = resource_department_id or DepartmentService.get_default_department(tenant_id).id
    if dept_id not in accessible:
        raise DepartmentPermissionDeniedError("无权访问该资源")
```

调用处补 `resource_tenant_id=app.tenant_id`（app 侧）/ `resource_tenant_id=dataset.tenant_id`（dataset 侧）。

**R4 试用应用例外：** `get_app_model_with_trial`（wraps.py:72，经 :27 加载 App 时**不过滤 tenant_id**）用于跨租户试用应用，其部门不在当前用户可访问集合内——**不能无条件加守卫**。改为仅当 `app.tenant_id == current_user.current_tenant_id` 时才执行 `assert_department_access`，跨租户试用跳过。dataset 侧若无试用等价物则无此例外。

- [ ] **Step 1: 写失败测试**（单元级：`get_app_model` 装饰器 + mock current_user）：普通成员取他部门 app_id → 403；owner/admin → 放行；department_id 为 NULL 的存量资源 → 按默认部门判定放行（同部门）；mock 到部门集合外 → 403；**get_app_model_with_trial：跨租户试用 app 跳过校验放行、同租户试用 app 照常校验（R4）**；**dataset 侧装饰器同矩阵（T4）：他部门 dataset → 403、NULL → 默认部门放行、owner/admin 放行**
- [ ] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/controllers/console/app/test_department_access_guard.py -v`
- [ ] **Step 3: 实现**（先 grep 定位 dataset 侧装饰器；`get_app_model_with_trial`（wraps.py:72）按 R4 加“同租户才校验”分支，勿无条件加；另 grep `select(App)` 排查 console 内绕过装饰器的直查点，如 `app.py:673`（复制流程，已属 R1 创建路径））
- [ ] **Step 4: 跑既有 console app/dataset 控制器单测防回归** — `uv run --project api pytest tests/unit_tests/controllers/console/app tests/unit_tests/controllers/console/datasets -v`
- [ ] **Step 5: Commit** — `feat(department): enforce department access on single-resource console endpoints`

### Task 8: 部门管理员设置/取消 + 移动成员（Service 层）

**Files:**
- Modify: `api/services/department_service.py`（追加方法）
- Test: `api/tests/unit_tests/services/test_department_member_service.py`

**Interfaces (Produces):**
```python
@staticmethod
def set_department_admin(tenant_id: str, department_id: str, account_id: str, operator_ip: str | None = None) -> None: ...
    # 校验：join 存在且 department_id 匹配该成员所在部门；role in {owner, admin, editor}
@staticmethod
def unset_department_admin(tenant_id: str, department_id: str, account_id: str, operator_ip: str | None = None) -> None: ...
@staticmethod
def move_member(operator: Account, tenant_id: str, account_id: str, target_department_id: str,
                operator_ip: str | None = None) -> None: ...
    # 悲观锁 with_for_update；规则：admin 任意移动；部门管理员仅可移动范围内成员且不能移自己；
    # 目标部门也须在操作者范围内；成员若是部门管理员→is_department_admin=False + 邮件通知租户管理员
@staticmethod
def revoke_department_admin_and_notify(tenant_id: str, account_id: str, reason: str) -> None: ...
    # 发邮件：get_email_i18n_service().send_raw_email（收件人=owner/admin 的 join.account.email，先 mail.is_inited() 守卫）
```
审计：set/unset/move 分别写 `set_department_admin`/`unset_department_admin`/`move_member`。

- [ ] **Step 1: 写失败测试**：`test_set_admin_requires_membership`、`test_set_admin_rejects_normal_role`、`test_move_member_by_dept_admin_within_scope`、`test_move_member_cannot_move_self`（部门管理员）、`test_move_member_out_of_scope_denied`、`test_move_member_revokes_admin_flag_and_notifies`（断言 send_raw_email 被调）、**`test_revoke_notify_skips_when_mail_not_inited`（U3：`mail.is_inited()` False 时不发、不抛错）**、`test_audit_logs_written`
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现**（move_member 依设计用 `with_for_update()` 锁 join 行；权限矩阵见 Global Constraints）
- [ ] **Step 4: 测试通过**（**T9 回归**：`uv run --project api pytest tests/unit_tests/services/ tests/unit_tests/controllers/console/workspace/ -v`——move_member/set_admin 涉及成员与工作区共享路径）
- [ ] **Step 5: Commit** — `feat(department): member move and department admin management with auto-revoke`

### Task 9: 手动创建成员（邮箱全局唯一）

**Files:**
- Modify: `api/services/account_service.py`（RegisterService 加 `create_member_by_admin`）
- Create: `api/tasks/mail_member_created_task.py`（Celery task，queue="mail"，发含初始密码的邮件；先 `mail.is_inited()` 守卫，用 `send_raw_email` 简单 HTML）
- Test: `api/tests/unit_tests/services/test_create_member_by_admin.py`（T2 追加 `test_weak_password_rejected`——R9：`valid_password` 拒绝弱密码）、`api/tests/unit_tests/tasks/test_mail_member_created_task.py`（T2 新增：`mail.is_inited()` False 时不发送、True 时 `send_raw_email` 被调、**task kwargs 与日志不含明文密码（R10）**）

**Interfaces (Produces):**
```python
class RegisterService:
    @staticmethod
    def create_member_by_admin(operator: Account, tenant_id: str, *, name: str, email: str,
                               password: str, department_id: str, role: TenantAccountRole) -> Account: ...
```
规则：`Account.query.filter_by(email=email)` 任何租户存在（含 PENDING）→ `AccountEmailAlreadyInUseError(BaseServiceError)`；非 admin 操作者的部门管理员仅可选 editor/normal/dataset_operator 且 department_id 须在其范围内；密码走 `valid_password`（libs/password.py）+ `hash_password`——**R9 有意偏离**：spec 称"初始密码无特殊安全要求（建议）"，此处强制 `valid_password`（≥8 位含字母数字）以与系统其余密码校验一致，已记录为有意偏离；Account status=ACTIVE；join 走 `TenantService.create_tenant_member(tenant, account, role=role, department_id=department_id)`（复用 owner 唯一性校验）；**随后必须调 `AccountService.switch_tenant(account=account, current_tenant=tenant)` 置 `current=True`（R5：create_tenant_member 不设置 current，对齐 invite_new_member 流程，否则新成员登录后 current_tenant_id 为 None，所有租户上下文接口 403）**；派发 `send_member_created_mail_task.delay(...)`（**R10：task 与日志不得记录明文密码**）；审计 `create_member`。

- [ ] **Step 1: 写失败测试**：`test_email_exists_anywhere_rejected`、`test_dept_admin_cannot_create_admin_role`、`test_dept_admin_scope_check`、`test_password_hashed_and_join_created`、`test_switch_tenant_called_after_join`（R5）、`test_mail_task_dispatched`、`test_audit_log_written`、**`test_weak_password_rejected`（T2/R9）**
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现 service + task**
- [ ] **Step 4: 测试通过**
- [ ] **Step 5: Commit** — `feat(department): admin manual member creation with global-unique email`

### Task 10: 成员 API 扩展 + 移除邀请制

**Files:**
- Modify `api/controllers/console/workspace/members.py`：
  - 删除 `MemberInviteEmailApi`（POST `/members/invite-email`）
  - `MemberCancelInviteApi` **改造**为 `MemberRemovalApi`（DELETE `/workspaces/current/members/<uuid:member_id>` 保留）：剥掉 PENDING 待激活邀请分支，只走 `TenantService.remove_member_from_tenant`（**不可整类删除**——该端点也是现有唯一的成员移除入口，spec 的移出成员操作依赖它）；若移除的是部门管理员，join 行删除即带掉 is_department_admin，无需额外清理
  - `MemberListApi`（:76-90）权限收紧：非 admin 且非部门管理员 → 403；admin 见全部，部门管理员按 `manageable_department_ids` 过滤 join；响应元素追加 `department_id/department_name/is_department_admin`
  - 新增 `MemberCreateApi` POST `/workspaces/current/members`，挂 `@decrypt_password_field`（wraps.py:458，field encryption 部署兼容）+ `@cloud_edition_billing_resource_check("members")`（原邀请端点挂的计费配额检查，防 CLOUD 超卖，删除邀请时不能丢）
  - `MemberUpdateRoleApi`（:196-225）：角色降级为 normal/dataset_operator 时调 `revoke_department_admin_and_notify`
  - 新增 `MemberCreatedResourcesApi` GET `/workspaces/current/members/<uuid:member_id>/created-resources`（**G1**，权限同移动成员：owner/admin 或范围内部门管理员）→ `{apps: [{id, name, department_id, department_name}], datasets: [{id, name, department_id, department_name}]}`
  - 新增 `MemberOperationLogApi` GET `/workspaces/current/members/<uuid:member_id>/operation-logs`（**G2**，仅 owner/admin）→ 复用 `DepartmentAuditLog.query(tenant_id, "account_id", member_id, limit)`
- Modify `api/services/department_service.py`：新增 `get_member_created_resources(tenant_id, account_id)`（按 `App.created_by == account_id` / `Dataset.created_by == account_id` 查，批量取部门名映射避免 N+1，返回含 department_name 的 dict 列表）
- Modify `api/services/account_service.py`：删除 `RegisterService.invite_new_member`（:1449-1503）、`generate_invite_token`（:1506-1515）、`is_valid_invite_token`（:1518-1520）、`revoke_token`（:1522+）、**C4 追加：`get_invitation_by_token`(:1572-1594)、`get_invitation_with_case_fallback`(:1597-1604)、`get_invitation_if_token_valid`（如有）**、**V8 追加：`_get_invitation_token_key`(:1345-1347)**
- **V2 新增：清理 `authenticate` 方法的 `invite_token` 参数**——`api/services/account_service.py:186` 的 `authenticate(email, password, invite_token=None)` 方法移除 `invite_token` 参数和 L196-203 的密码设置分支；同步修改 `login.py:333-341` 的 `_authenticate_account_with_case_fallback` 签名（移除 `invite_token` 参数）
- Delete `api/tasks/mail_invite_member_task.py`
- **V10 新增：删除 `check_workspace_member_invite_permission` 函数**（`api/libs/workspace_permission.py`，邀请制移除后无调用方）
- Modify `api/services/account_service.py:1157-1173` 中 `get_tenant_members` 改造（**I6 批量查询策略**：先 select `Account, TenantAccountJoin.role, TenantAccountJoin.department_id, TenantAccountJoin.is_department_admin`；收集所有 `department_id` 去重后批量 `Department.query.filter(Department.id.in_(dept_ids)).all()` 构建 `{id: name}` 映射；最后挂到 account 对象上，避免 N+1）
- **T1 邀请制移除的回归清单（实测，必须逐一处理，否则 CI 全红）：**
  - `api/tests/unit_tests/controllers/console/test_workspace_members.py:7`：`from ...members import MemberInviteEmailApi` → 收集期 ImportError，改写/删除
  - `api/tests/unit_tests/controllers/console/workspace/test_members.py:20`：同，import 清理 + 邀请用例改写为 create_member_by_admin 用例；移除成员用例保留并适配
  - `api/tests/unit_tests/services/test_account_service.py:1494-1780`：7+ 个 invite/token 用例（invite_new_member/is_valid_invite_token/revoke_token）改写为 create_member_by_admin 用例
  - `api/tests/test_containers_integration_tests/tasks/test_mail_invite_member_task.py`：整文件删除（import 被删 task）
  - `api/tests/test_containers_integration_tests/services/test_account_service.py:2684-3129`：invite/token 用例改写（CI 环境执行）
  - `api/tests/test_containers_integration_tests/controllers/console/auth/test_oauth.py:228`（**I2 修正：源码 `oauth.py:120`，测试文件 L228**）：`is_valid_invite_token` 分支用例改写/删除
  - `api/tests/unit_tests/controllers/console/auth/test_account_activation.py`（8 处 patch `RegisterService.revoke_token`）：**C3：activate 流程完全依赖邀请系统，移除邀请制后 `activate.py` 的两个端点（`ActivateCheckApi.get` L62-87、`ActivateApi.post` L90-126）应整体删除**——连同前端 `signin/invite-settings` 路由一并删除；该测试文件整体删除
  - **C2 新增：`api/controllers/console/auth/login.py:58,103-118`**——`EmailPasswordLoginPayload` 的 `invite_token` 字段（L58）和 L103-118 的 `get_invitation_with_case_fallback` 验证逻辑必须移除
  - **C4 新增：`api/services/account_service.py` 追加删除方法**——`get_invitation_by_token`(:1572-1594)、`get_invitation_with_case_fallback`(:1597-1604)、`get_invitation_if_token_valid`（如有）一并删除
  - 前端 `web/app/components/header/account-setting/members-page/__tests__/invite-button.spec.tsx`：删除；`.../__tests__/index.spec.tsx`：改写（去 invite-button/invite-modal mock）
  - **C3 新增：前端 `web/app/signin/invite-settings/` 目录删除**（V3 修正：不在 `(shareLayout)` 下）
  - **V1 新增：前端 signin 组件邀请逻辑清理（6+ 文件）**：
    - `web/app/signin/normal-form.tsx:29,39,56-64,141-197`：移除 `invite_token`/`isInviteLink`/`invitationCheck` 调用/传 `isInvite` prop
    - `web/app/signin/components/mail-and-password-auth.tsx:19,24,58-59,74-75,106`：移除 `isInvite` prop 和 `invite_token` 传参
    - `web/app/signin/components/mail-and-code-auth.tsx:14,17,66`：移除 `isInvite` prop
    - `web/app/signin/components/sso-auth.tsx:22,29,36,44`：移除 `invite_token` 传参
    - `web/app/signin/components/social-auth.tsx:19-20`：移除 `searchParams.has('invite_token')` 拼接
    - `web/app/signin/check-code/page.tsx:24,47,50-51`：移除 `invite_token` 逻辑和跳转
  - **V4 新增：删除 `web/app/activate/` 目录**（`page.tsx` + `activateForm.tsx`，邀请激活流程前端入口）
  - **V5 新增：删除 `invitationCheck` 服务函数**（`web/service/common.ts:180`）和 `useInvitationCheck` hook（`web/service/use-common.ts:50,350-361`）
  - **V6 新增：删除 `activateMember` 服务函数**（`web/service/common.ts:184`）
  - **V11 新增：Task 16 补充 `normal-form.tsx` 的 `isInviteLink` UI 差异清理**（email 输入框 disabled 状态）

**Interfaces (Produces):**
- POST `/console/api/workspaces/current/members`，payload `{name, email, password, department_id, role, is_department_admin?}`（`is_department_admin` 仅 owner/admin 可传；部门管理员 payload 里传了→403）→ 201 返回 `{id, name, email, department_id, role, is_department_admin, created_at}`
- DELETE `/console/api/workspaces/current/members/<uuid:member_id>` **保留**（成员移除）
- GET `/console/api/workspaces/current/members/<uuid:member_id>/created-resources`（**G1**，移动成员确认框明细数据源）
- GET `/console/api/workspaces/current/members/<uuid:member_id>/operation-logs`（**G2**）
- `GET /console/api/workspaces/current/members/invite-email` 不再存在 → 404

- [ ] **Step 1: 写失败测试**：POST /members 201/400/403 矩阵、GET /members 三角色裁剪、invite-email 路由 404、**DELETE /members/<id> 移除成员仍可用**（部门管理员移除后 join 删除）、update-role 降级触发撤销（mock revoke）、**created-resources 200（含 department_name）与非 owner/越界部门管理员 403（G1）**、**member operation-logs 200/非 owner 403（G2）**、**`get_member_created_resources` service 级用例（T6：按 created_by 过滤、批量 department_name 映射无 N+1、空资源返回空列表）**
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现**（先全库 grep `invite_new_member|invite-email|invite_button|invite-modal|revoke_token|is_valid_invite_token|activate` 清点引用；确认 `MemberCancelInviteApi` 现实现中同时承担成员移除分支，改造而非删除）
- [ ] **Step 4: 测试通过**（**全量回归，T1**：`uv run --project api pytest tests/unit_tests/ -v` + `pnpm test`——不再只跑 workspace 目录，否则上述 ImportError/AttributeError 逃过本任务直接红到 CI）
- [ ] **Step 5: Commit** — `feat(department): member APIs with department fields; remove invitation flow`

---

## Milestone 3：应用/知识库数据隔离

### Task 11: 应用列表过滤 + 创建归属 + 转移 + 精确过滤参数

**Files:**
- Modify: `api/services/app_service.py:34-78`（`get_paginate_apps`）与 `:80-172`（`create_app`）
- Modify: `api/controllers/console/app/app.py:462-524`（AppListApi 传 `current_user`；payload/args 支持 `department_id` 精确过滤与 `is_created_by_me` 并存）+ 新增 `AppTransferDepartmentApi` PUT `/apps/<uuid:app_id>/transfer-department`（payload `{department_id}`）——**必须用 `@get_app_model` 装饰器加载 app**（Task 7 已在其内嵌部门守卫，R2 防越权转移），并叠 `@edit_permission_required`；勿自建路由绕过守卫
- Test: `api/tests/unit_tests/services/test_app_service_department.py`、`api/tests/unit_tests/controllers/console/app/test_app_transfer_api.py`（T3：控制器层——@get_app_model 守卫生效即跨部门 editor 403、payload 校验 400、app 不存在 404、admin 200）

**Interfaces:**
```python
# ⚠️ I3 签名变更：get_paginate_apps(user_id, tenant_id, args) → get_paginate_apps(user: Account, tenant_id, args)
# 调用方 app.py:481 必须同步改为传 current_user 而非 current_user.id
# get_paginate_apps(user_id, tenant_id, args) → get_paginate_apps(user: Account, tenant_id, args)，
# 旧调用方（仅 AppListApi）同步补参；构造 filters 后追加：
accessible = DepartmentService.get_accessible_department_ids(user, tenant_id)
if accessible is not None:
    filters.append(DepartmentService.resource_department_filter(App, tenant_id, accessible))  # coalesce 语义，勿用裸 in_
if args.get("department_id"):
    filters.append(App.department_id == args["department_id"])
# create_app：department_id = DepartmentService.resolve_department_id_for_creation(user, tenant_id, args.get("department_id"))
# 转移：admin 任意；部门管理员目标须在 get_manageable_department_ids 内；其他 403；审计 transfer_app
# G4：列表序列化处给每个 app 补 department_name（查询后按 department_id 批量取部门名映射，避免 N+1），
#      供前端卡片展示"部门： 技术部 > 前端组"
```

**创建路径补全（R1，本任务一并处理）：** 应用复制流程（`api/controllers/console/app/app.py` AppCopyApi 段，约 :640-674，复制后经 :673 重查 App）与 DSL 导入（`api/services/app_dsl_service.py:458` `app = App()` 处）是 console 用户侧创建路径，**必须**经 `resolve_department_id_for_creation(user, tenant_id, None)` 赋值 department_id，否则复制/导入出的应用对非管理员不可见。`workflow_converter.py:84` 的 `new_app = App()` 为内部转换（非直接用户创建），不强制赋值（NULL 由 coalesce 兜底），但若其上游持有 user 则一并赋值。

- [ ] **Step 1: 写失败测试**：普通成员列表被 coalesce 过滤——**T10 改为行为级断言：编译 `str(query.compile())` 断言含 `COALESCE`、默认部门 id、accessible 集合值（勿只断言 filters 列表里出现 func.coalesce 调用，否则 coalesce 用错列/错默认部门也绿灯）**、**department_id 为 NULL 的行对默认部门成员可见（回归保护 R1）**、admin 不加过滤、`department_id` 精确过滤生效、创建时 admin 未选部门→默认部门、部门管理员越界部门→ValidationError、普通成员创建→自动本部门、转移权限矩阵、复制/DSL 导入路径设置了 department_id、**U4：AppListApi 控制器透传 `department_id` query 参数到 service 的用例**
- [ ] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/services/test_app_service_department.py -v`
- [ ] **Step 3: 实现**（grep `get_paginate_apps` 全部调用方同步补参）
- [ ] **Step 4: 跑 app 相关既有单测防回归** — `uv run --project api pytest tests/unit_tests/services/ -k app -v`
- [ ] **Step 5: Commit** — `feat(department): app list isolation, ownership on create, exact filter, transfer API`

### Task 12: 知识库列表过滤 + 创建归属 + 转移 + 精确过滤参数

**Files:**
- Modify: `api/services/dataset_service.py:112-180`（`get_datasets`，**I7 叠加顺序**：department 过滤在 `only_me/partial` 过滤**之后**叠加（AND），coalesce 使用 `Dataset.department_id` 而非 `Dataset.permission` 的列）+ `create_dataset`
- Modify: `api/controllers/console/datasets/datasets.py:291-332`（DatasetListApi 传 user；payload/args 支持 `department_id`）+ 新增 `DatasetTransferDepartmentApi` PUT `/datasets/<uuid:dataset_id>/transfer-department`——**必须走 Task 7 的 dataset 侧加载装饰器（含部门守卫）**，勿自建路由绕过
- Test: `api/tests/unit_tests/services/test_dataset_service_department.py`、`api/tests/unit_tests/controllers/console/datasets/test_dataset_transfer_api.py`（T3：镜像 Task 11 的 transfer API 控制器用例，含 dataset 侧守卫生效断言）

**创建路径补全（R1）：** `external_knowledge_service.py:252`、`rag_pipeline_dsl_service.py:305/437` 创建 dataset 处为机器/内部路径，NULL 由 coalesce 兜底（不强制赋值）；annotation 内部数据集（`tasks/annotation/*`）同理不强制，但其 `department_id` 保持 NULL 会让 `get_departments_with_counts` 的 dataset_count 不含它们——确认现状即如此（annotation 数据集不参与部门计数），在实现时以 coalesce 聚合保证一致性。**G4：列表序列化处给每个 dataset 补 `department_name`（批量取部门名映射，避免 N+1），供前端卡片展示。**

- [ ] **Step 1: 写失败测试**（同 Task 11 矩阵，另加：dataset_operator 只看被授权集合 ∩ 本部门、**NULL 部门行对默认部门成员可见**、**U4：DatasetListApi 控制器透传 `department_id` query 参数用例**）
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现**
- [ ] **Step 4: 跑 dataset 既有单测** — `uv run --project api pytest tests/unit_tests/services/ -k dataset -v`
- [ ] **Step 5: Commit** — `feat(department): dataset list isolation, ownership on create, exact filter, transfer API`

---

## Milestone 4：前端

### Task 13: oRPC 契约与数据 Hook

**Files:**
- Create: `web/contract/console/departments.ts`
- Modify: `web/contract/router.ts`（挂 `departments: departmentRouterContract`）
- Create: `web/service/use-departments.ts`
- Test: `web/__tests__/service/use-departments.test.tsx`

**Interfaces (Produces):** 契约路由（`base.route(...).input().output()`，参照 `web/contract/console/apps.ts`）：
`list`（GET `/workspaces/current/departments`）、`create`、`update`、`remove`、`move`（PUT `/departments/{id}/move`）、`members`（GET/PUT `/departments/{id}/members`）、`setAdmin`、`unsetAdmin`、`createMember`（POST `/workspaces/current/members`）、`transferApp`、`transferDataset`、`createdResources`（GET `/workspaces/current/members/{id}/created-resources`，G1）、`operationLogs`（GET `/workspaces/current/members/{id}/operation-logs` 与 GET `/departments/{id}/operation-logs`，G2）。Hook：`useDepartmentList()`（`consoleQuery.departments.list.queryOptions()`）、`useCreateDepartmentMutation()` 等 mutation + `useInvalidateDepartmentList()`、`useMemberCreatedResources()`、`useDepartmentOperationLogs()`。

- [ ] **Step 1: 写失败测试**（Vitest：**T10 契约 15 条路由参数化逐条断言 method/path/入参——避免测试与契约同源同错、路由拼错时双双绿灯**；queryKey 稳定性；`router.ts` 注册了 `departments` 路由的断言）
- [ ] **Step 2: 确认失败** — `pnpm test -- use-departments`
- [ ] **Step 3: 实现契约与 Hook**
- [ ] **Step 4: `pnpm type-check && pnpm lint`**
- [ ] **Step 5: Commit** — `feat(web/department): oRPC contracts and query hooks`

### Task 14: 设置弹窗 DEPARTMENTS Tab + 部门树 + 创建部门

**Files:**
- Modify: `web/app/components/header/account-setting/constants.ts`（`ACCOUNT_SETTING_TAB` 加 `DEPARTMENTS = 'departments'`）
- Modify: `web/app/components/header/account-setting/index.tsx`（`workplaceGroupItems` L67-71 邻近加 DEPARTMENTS 项；渲染区分支加 `<DepartmentPage />`；**I9 Tab 门控优先级**：先检查 `useAppContext().isCurrentWorkspaceManager`（admin/owner 直接可见，无需 API），再检查 `useDepartmentList().is_department_admin`（从 department list API 响应获取）；API 失败时降级：admin 仍可见，部门管理员**显示 Tab 但内容区渲染"加载失败，请刷新"**）
- Create: `web/app/components/header/account-setting/department-page/index.tsx`（列表容器：搜索框 + 树 + "创建部门"按钮仅 owner/admin；**G3 空状态**：无部门时租户管理员视图含"+ 创建第一个部门"CTA、部门管理员视图显示"请联系租户管理员创建部门"）
- Create: `web/app/components/header/account-setting/department-page/department-tree/{index.tsx,tree-item.tsx}`（递归树：展开/折叠、每节点显示 member/app/dataset 计数、[管理] 跳详情、[删除] 仅 owner/admin 且默认部门禁用；删除用 `AlertDialog` 确认，文案按 Web 设计 §确认对话框：含"此操作不可撤销"、四项计数检查、"如果部门下有数据，请先转移数据后再删除"；toast 用 `@/app/components/base/ui/toast`，成功/失败文案按 Web 设计 §状态反馈 文案表，G11）
- Create: `web/app/components/header/account-setting/department-page/create-department-modal/index.tsx`（名称*/父部门（树形 Select，过滤 is_default）/描述；父部门数据源 `tree` 中非默认节点）
- Modify: `web/i18n/zh-Hans/common.json`、`web/i18n/en-US/common.json`（`settings.departments`、`department.*` 平铺 key，按字母序插入）
- Test: `web/__tests__/department/department-tree.test.tsx`、`web/__tests__/department/departments-tab-gating.test.tsx`（T10：account-setting Tab 门控——mock `useAppContext` role 与 `useDepartmentList().is_department_admin` 两态，断言 owner/部门管理员可见、普通成员隐藏）、`web/__tests__/department/create-department-modal.test.tsx`（T10：名称必填校验、父部门过滤 is_default、提交 payload）

- [ ] **Step 1: 写失败测试**（RTL：渲染树数据→节点可见；is_default 节点删除按钮 disabled；非 admin 不显示创建按钮——通过 props 控制而非 context，便于测试；**空状态：管理员视图含 CTA、部门管理员视图显示联系文案（G3）**）
- [ ] **Step 2: 确认失败** — `pnpm test -- department-tree`
- [ ] **Step 3: 实现**（无现成 Tree 组件，自建递归 `TreeItem`；样式用 Tailwind，i-* 图标类）
- [ ] **Step 4: `pnpm type-check && pnpm lint && pnpm test`**
- [ ] **Step 5: Commit** — `feat(web/department): departments tab in account settings with tree UI`

### Task 15: 部门详情（成员/子部门/移动部门）

**Files:**
- Create: `web/app/components/header/account-setting/department-page/department-detail/{index.tsx,member-row.tsx,sub-department-list.tsx}`：返回按钮、标题+编辑（仅 owner/admin）、三计数卡、成员列表（角色/部门管理员标记；按钮：移出部门、设为/取消管理员仅 owner/admin 且 normal/dataset_operator 角色"设为管理员"禁用）、子部门列表
- Create: `.../move-member-modal/index.tsx`（目标部门 Select：admin=全部、部门管理员=范围内，来自 `manageable_department_ids`；**G1：打开时调 `useMemberCreatedResources()` 渲染该成员创建的应用/知识库**明细清单（名称+所在部门，空则显示"无"），确认框按 Web 设计 L734 展示；转移操作提示复用 Task 17 的单资源转移入口逐个执行；AlertDialog 确认）
- Create: `.../move-department-modal/index.tsx`（owner/admin；树形 Select 选新父部门，过滤自身/子孙/默认部门；调 `moveDepartment`）
- 部门详情页（department-detail/index.tsx）含 **G3 部门无成员空状态**：管理员视图含"+ 创建成员"CTA、普通成员视图"请联系管理员创建成员"
- Test: `web/__tests__/department/department-detail.test.tsx`

**交互约定：** 弹窗内二级导航用 Tab 本地状态（`selectedDepartmentId` + 返回按钮），不引入路由。

- [ ] **Step 1: 失败测试**（成员行渲染、admin 与部门管理员的按钮可见性矩阵、移出自己禁用、移动部门目标过滤、**move-member-modal 渲染 created-resources 明细清单（G1）**、**部门无成员空状态双视角（G3）**）
- [ ] **Step 2: 确认失败** — `pnpm test -- department-detail`
- [ ] **Step 3: 实现**
- [ ] **Step 4: type-check + lint + test**
- [ ] **Step 5: Commit** — `feat(web/department): department detail with member and move management`

### Task 16: 成员页改造（部门筛选 + 创建成员，移除邀请 UI）

**Files:**
- Delete: `web/app/components/header/account-setting/members-page/invite-modal/`、`invite-button.tsx`、`invited-modal/`
- Modify: `web/app/components/header/account-setting/members-page/index.tsx`（列表项显示部门面包屑；顶部加部门筛选 Select，数据 `useDepartmentList().manageable_department_ids` 过滤；"创建成员"按钮打开新 CreateMemberModal 成为唯一入口——可见性：owner/admin 或 `is_department_admin` 时显示，普通成员隐藏）
- Create: `web/app/components/header/account-setting/members-page/create-member-modal/index.tsx`（姓名/邮箱/初始密码/所属部门 Select（范围同上）/租户角色 Select（部门管理员时仅 editor/normal/dataset_operator 选项）/"设为部门管理员"checkbox 仅 owner/admin 显示）
- Modify: `.../members-page/operation/index.tsx`（编辑对话框加所属部门字段与移动成员入口，租户角色对部门管理员只读）
- Modify: i18n 两语言文件（**G11：Toast/确认框文案按 Web 设计 §状态反馈、§确认对话框 文案表实现**，如"成员创建成功，已发送通知邮件"/"邮箱已被其他租户使用"）
- Test: `web/__tests__/department/create-member-modal.test.tsx`、`web/__tests__/department/members-page-department.test.tsx`（T10：部门筛选 Select 用 manageable_department_ids 过滤、列表项部门面包屑渲染、operation 编辑对话框角色对部门管理员只读与移动成员入口）

- [ ] **Step 1: 失败测试**（部门管理员时角色选项过滤、checkbox 隐藏、提交 payload 断言、invite 入口不再渲染）
- [ ] **Step 2: 确认失败** — `pnpm test -- create-member-modal`
- [ ] **Step 3: 实现**
- [ ] **Step 4: 全量 `pnpm type-check && pnpm lint && pnpm test`**
- [ ] **Step 5: Commit** — `feat(web/department): members page with department filter and manual creation`

### Task 17: 应用/知识库列表页部门筛选与转移

**Files:**
- Create: `web/app/components/apps/department-filter-tabs.tsx`（标签组：全部+各部门含计数；当前选中写回 `useAppsQueryState` 的 URL query `department_id`，列表请求透传——后端 args 已在 Task 11/12 支持）
- Modify: `web/app/components/apps/index.tsx`（挂载筛选标签）
- Modify: `web/app/components/explore/create-app-modal/index.tsx`（owner/admin/部门管理员显示"所属部门"Select，普通成员显示自动归属提示）
- Modify: 应用卡片组件（执行时 `grep -rln "更多\|MoreActions\|useDeleteAppMutation" web/app/components/apps web/app/components/explore` 定位实际卡片文件——按调研在 `explore/app-card/` 附近）"更多"菜单加"转移部门"，弹 TransferDepartmentModal；权限不足不渲染该项——`useAppContext().isCurrentWorkspaceEditor` + isCurrentWorkspaceManager；**G4：卡片副标题渲染"部门： {department_name} | 创建者： {creator}"（字段来自 Task 11 列表响应）**
- Create: `web/app/components/apps/transfer-department-modal/index.tsx`（复用于 datasets：props 化 resource 类型）
- Modify: `web/app/components/datasets/list/index.tsx`、`web/app/components/datasets/create` 入口、dataset-card "更多"菜单（同上镜像，**含 G4 卡片部门面包屑渲染**）
- Modify: `web/service/use-apps.ts` / `web/service/knowledge/use-dataset.ts`（列表参数加 `department_id`）
- Modify: i18n 两语言文件
- Test: `web/__tests__/department/department-filter-tabs.test.tsx`、`web/__tests__/department/app-card-transfer-menu.test.tsx`（T10：卡片"转移部门"入口权限显隐——`isCurrentWorkspaceEditor`/`isCurrentWorkspaceManager` 矩阵、转移弹窗目标范围）、`web/__tests__/department/create-app-department-select.test.tsx`（T10：create-app-modal 部门 Select 管理员显示/普通成员显示自动归属提示、payload 含 department_id）、`web/__tests__/department/list-hooks-department-param.test.tsx`（T10：use-apps/use-dataset 透传 `department_id` 参数）

- [ ] **Step 1: 失败测试**（标签渲染计数、点击后 query state 变化、转移弹窗目标部门范围、**卡片渲染部门面包屑（G4）**）
- [ ] **Step 2: 确认失败** — `pnpm test -- department-filter-tabs`
- [ ] **Step 3: 实现**
- [ ] **Step 4: type-check + lint + test**
- [ ] **Step 5: Commit** — `feat(web/department): department filter tabs, ownership selectors and transfer modals`

---

## Milestone 5：应用发布 + 探索过滤 + 聊天鉴权（全局开关）

### Task 18: 发布模型与迁移

**Files:**
- Modify: `api/models/department.py`（加 `AppPublishedDepartment`：id、app_id、department_id、published_by、created_at + unique(app_id, department_id) + 两索引；`api/models/__init__.py` 追加 import）
- Create: `api/migrations/versions/2026_08_26_1100-b3e5f7a9c1d2_add_app_published_departments.py`（down_revision = "9f2c8d4e6a1b"；建表 + 存量自动发布 INSERT：`enable_site=true AND department_id IS NOT NULL AND status='normal'`，`ON CONFLICT DO NOTHING`，published_by=app.created_by）
- Test: `api/tests/unit_tests/models/test_department.py` 追加

- [ ] **Step 1-4: 失败测试→失败→实现→通过**（同 Task 1 模式）。**T8 迁移 CI 对齐同 Task 3**：离线 `flask db upgrade --sql` 验证 + MySQL 分支条件跳过（本迁移无 partial index，主要验证回填 INSERT 兼容性）
- [ ] **Step 5: Commit** — `feat(department): app_published_departments table with auto-publish backfill`

### Task 19: 发布 Service + API（含 can_access 与删除联动）

**Files:**
- Create: `api/services/app_publish_service.py`（`class AppPublishService`）
- Create: `api/controllers/console/app/publish_department.py`（GET/PUT `/apps/<uuid:app_id>/publish-departments`，装饰器 `@setup_required @login_required @account_initialization_required @get_app_model`（**必须，R2：Task 7 的部门守卫内嵌于此，防跨部门 editor 越权发布**）+ `@edit_permission_required`（wraps.py:308））
- Modify: `api/services/department_service.py`（`delete_department` 追加第 5 项检查）
- Modify: `api/services/app_service.py:354`（`delete_app` 级联删发布记录）
- Modify: `api/controllers/console/__init__.py` import 注册
- Test: `api/tests/unit_tests/services/test_app_publish_service.py`、`api/tests/unit_tests/controllers/console/app/test_publish_department_api.py`（T3：控制器层——GET 200、PUT 200/400（enable_site=false）/403（@get_app_model 守卫 + edit_permission 叠加）、payload 校验；service 测试保留数据面断言）

**Interfaces (Produces):**
```python
class AppPublishService:
    @staticmethod
    def get_published_departments(app_id: str) -> list[dict]: ...
        # 返回 [{id, name, path}]
    @staticmethod
    def update_published_departments(user: Account, tenant_id: str, app_id: str,
                                     department_ids: list[str], operator_ip: str | None = None) -> list[dict]: ...
        # 去重；app.enable_site=false → 400；diff 后 INSERT/DELETE；
        # 审计 publish_app_to_departments / unpublish_app_from_departments（content 记部门 id 列表）
    @staticmethod
    def can_access(user: Account, tenant_id: str, app_id: str) -> bool: ...
        # owner/admin → True；否则 app 发布到 get_accessible_department_ids 内任一部门 → True
```
`delete_department` 追加：本部门作为发布目标存在 `app_published_departments` 记录（`department_id == id`）→ 拒绝删除（提示先取消发布）。`delete_app` 追加：删除 app 时先 `DELETE FROM app_published_departments WHERE app_id = :app_id`。

- [ ] **Step 1: 写失败测试**：全量替换 diff（新增 INSERT/移除 DELETE）、重复部门去重、enable_site=false 400、审计日志写入、`can_access` 四象限（admin/发布到本部门/未发布/取消发布后）、delete_department 第 5 项拦截、delete_app 级联清理、**跨部门 editor 对非本部门 app 转移/发布 → 403（R2 回归）**
- [ ] **Step 2: 确认失败** — `uv run --project api pytest tests/unit_tests/services/test_app_publish_service.py -v`
- [ ] **Step 3: 实现**
- [ ] **Step 4: 测试通过 + ruff + **T9 回归**：`uv run --project api pytest tests/unit_tests/services/ -k app -v`（本任务改了 delete_app）**
- [ ] **Step 5: Commit** — `feat(department): app publish-departments API, can_access, delete cascade`

### Task 20: 探索列表部门过滤（后端 + 开关）

**Files:**
- Modify: `api/configs/feature/__init__.py`（**I4 接入路径**：在 `class BaseConfig` 后新增 `class DepartmentConfig(BaseModel)`：`DEPARTMENT_ACCESS_CONTROL_ENABLED: bool = Field(default=False, alias="DEPARTMENT_ACCESS_CONTROL_ENABLED")`；在 `DifyConfig` 类中加 `department: DepartmentConfig = DepartmentConfig()`；`api/configs/feature/__init__.py` 末尾 `__all__` 导出 `DepartmentConfig`）
- **T7 配置一致性（否则 CI `pytest_config_tests.py` 红）**：`dev/pytest/pytest_config_tests.py:90-95` 实际比对三方——**`api/.env.example`**（U2 补充）、`docker/.env.example`、`docker/docker-compose.yaml` x-shared-env。三处都加 `DEPARTMENT_ACCESS_CONTROL_ENABLED=false`：改 `api/.env.example`、`docker/.env.example`、`docker/docker-compose-template.yaml`，随后运行 `docker/generate_docker_compose` 重新生成 compose（AGENTS.md：禁止手改 docker-compose.yaml 生成物）
- Create: `api/controllers/console/explore/department_app.py`（GET `/explore/department-apps`：按角色查 `EXISTS(app_published_departments)`（admin=任意发布；部门管理员=范围内部门；成员=本部门）+ `status='normal'` + `enable_site=true`，LEFT JOIN installed_apps 补 `is_installed/is_pinned`，排序置顶优先→published_at 倒序）
- Modify: `api/controllers/console/explore/installed_app.py:50-128`（flag 开启时 InstalledAppsListApi 追加发布权限 EXISTS 过滤；flag 关闭零改动）
- Modify: `api/controllers/console/explore/installed_app.py:130-172`（POST `/installed-apps` 安装端点，**R7**：现要求 RecommendedApp + is_public，department-apps 不满足——flag 开启时放宽为"app 已发布到当前用户可访问部门"即可安装，用于收藏/置顶；flag 关闭维持现状）
- Modify: `api/services/feature_service.py:225`（**I4 补充**：`_fulfill_system_params_from_env` 方法内追加 `features.department_access_control = dify_config.department.DEPARTMENT_ACCESS_CONTROL_ENABLED`；`SystemFeatureModel` 追加 `department_access_control: bool = False` 字段）
- Test: `api/tests/unit_tests/controllers/console/explore/test_department_apps.py`

- [ ] **Step 1: 写失败测试**（三种角色的可见集合、flag 关闭时 installed 列表不过滤、未发布应用不可见、取消发布后已安装记录静默过滤、systemFeatures 暴露 enabled、**flag 开启时对已发布部门应用可安装（R7）、未发布应用安装仍拒绝**）
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现**
- [ ] **Step 4: `uv run --project api pytest tests/unit_tests/controllers/console/explore/ -v`**
- [ ] **Step 5: Commit** — `feat(department): explore department-apps endpoint and publish-gated installed list`

### Task 21: 探索前端切换 + 发布管理 UI

**Files:**
- Modify `web/contract/console/explore.ts`、`web/contract/router.ts`：新增 `explore.departmentApps` 契约；`web/contract/console/system.ts`：systemFeatures 加 `departmentAccessControl.enabled`
- Modify `web/service/use-departments.ts`：追加 `useDepartmentExploreApps()`（Task 13 已建该文件，此处为追加而非新建）
- Modify `web/app/components/explore/app-list/index.tsx`：flag 开启时数据源切到 department-apps；flag 关闭维持现状
- Create `web/app/components/app/overview/publish-department-panel/index.tsx`：挂在应用概览设置区（与 `settings/index.tsx`、`apikey-info-panel` 平级），展示发布状态/已发布部门列表 + "编辑发布部门"按钮（normal/dataset_operator 只读隐藏按钮）
- Create `.../publish-department-modal/index.tsx`：部门树复选框多选（复用 Task 14 的 TreeItem），保存调 PUT `/apps/{id}/publish-departments`
- Modify i18n zh-Hans/en-US
- Test: `web/__tests__/department/publish-department-panel.test.tsx`、`web/__tests__/department/explore-source-switch.test.tsx`

- [ ] **Step 1: 失败测试**（panel 按角色显隐、多选保存 payload、flag 关闭时 explore 数据源不变、flag 开启时调用 department-apps 契约）
- [ ] **Step 2: 确认失败** — `pnpm test -- publish-department-panel && pnpm test -- explore-source-switch`
- [ ] **Step 3: 实现**
- [ ] **Step 4: type-check + lint + test**
- [ ] **Step 5: Commit** — `feat(web/department): publish management panel and explore source switch`

### Task 22: 聊天 URL 鉴权（服务端强制 + 前端 guard）

**后端 Files:**
- Create `api/controllers/web/chat_access.py`：**GET** `/api/chat-access/verify?app_code=...`（GET 规避 console CSRF）。自实现鉴权：`extract_access_token(request)`（cookie/Bearer）→ `PassportService().verify` → payload 含 `account_id` 才视为控制台登录态 → 加载 Account → `AppPublishService.can_access`。flag 关闭 → 404。响应：成功 `{access: true, app_info: {app_id, name, icon_type, icon, icon_background, description, mode}}`；拒绝 `{access: false, code: "access_denied", message}`；不存在/未启用 `{access: false, code: "not_found"}`
- Modify `api/controllers/web/passport.py:34` `PassportResource.get`：flag 开启时服务端强制——解析控制台登录态，无登录态或 `can_access` 为假 → 401/403；通过后创建/复用绑定账号的 EndUser（`session_id=f"console:{account_id}"`，`is_anonymous=False`）再签发 webapp passport
  - **R3 存量 token 封堵（必须）**：webapp passport payload 无 `exp`（passport.py:88-94），flag 开启前签发的匿名 token 永不过期、仍存于用户 localStorage。因此仅在签发口设卡不够。**在 `api/controllers/web/wraps.py:41` `decode_jwt_token`（全部 web 资源的唯一入口，`WebApiResource.method_decorators`）追加检查：flag 开启且 `end_user.is_anonymous` → 401**。一处改动封死全部 web 资源（message/conversation/workflow/audio 等）的存量匿名 token。
  - **有意偏离设计**：设计要求弃用 EndUser 直用 Account，但 web 资源（message/conversation/workflow 等 40+ 处）签名依赖 `end_user`，改为保留 EndUser 管道、账号身份编码进 session_id
- Test: `api/tests/unit_tests/controllers/console/test_chat_access_verify.py`、`api/tests/unit_tests/controllers/web/test_passport_department_gate.py`；**U1 适配既有测试**：`api/tests/unit_tests/controllers/web/test_wraps.py`（`decode_jwt_token` 约 8 个用例，重度 patch `controllers.web.wraps.*`——R3 新增的 `flag + is_anonymous → 401` 分支需保证 flag-off 时现有用例零变化，并补 flag-on 用例）、`test_web_passport.py` / `test_passport.py`（测 `PassportResource.get`，flag-on 强制路径需适配）

**前端 Files:**
- Create `web/app/(shareLayout)/components/chat-access-guard.tsx`（读 `systemFeatures.departmentAccessControl.enabled`；flag 开启时**直接调 `GET /api/chat-access/verify?app_code=`，不先读本地登录态（R11 简化，消除本地判断时序问题）**：**I5 必须用 `fetch(url, {credentials: 'include'})` 确保携带 console access token cookie**；401→重定向 `/signin?redirect={当前路径}`（signin 已支持 `resolvePostLoginRedirect`，web/app/signin/utils/post-login-redirect.ts:9）；403→渲染无权限页含"返回控制台"按钮；200→放行渲染聊天）
- Modify `web/app/(shareLayout)/components/splash.tsx`（flag 开启时插入 guard 逻辑）
- Test: `web/__tests__/department/chat-access-guard.test.tsx`

- [ ] **Step 1: 写两端失败测试**（后端：flag off 404、无登录态 401、部门不匹配 403 响应体、admin 放行、passport 强制路径（无登录态 401 / can_access 假 403 / 通过后签发 is_anonymous=False 且 session_id 前缀 console:）、**decode_jwt_token 挡存量匿名 token：flag 开启 + is_anonymous → 401，flag 关闭放行**、**U5：`{access:false, code:"not_found"}` 分支、`extract_access_token` cookie 与 Bearer 两种解析各一用例**；前端：未登录重定向、403 渲染提示、flag off 不拦截）
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现**
- [ ] **Step 4: `uv run --project api pytest tests/unit_tests/controllers/web/ -v`（U1：整目录回归，含 test_wraps/test_web_passport/test_passport + chat_access，勿只跑 `-k chat_access`）+ `pnpm test -- chat-access-guard`**
- [ ] **Step 5: Commit** — `feat(department): gated chat URL access verification with server-side enforcement`

### Task 23: 收尾验证

- [ ] `make lint && make type-check && make test`（后端全量）
- [ ] `pnpm type-check && pnpm lint && pnpm test`（前端全量）
- [ ] 手动冒烟（本地 dev 环境）：`dev/start-dev-env` → `uv run --project api flask db upgrade` → 建部门树 → 手动建成员（owner/部门管理员/普通成员各一）→ 验证列表隔离/转移/发布/聊天开关
- [ ] Commit（如有修复）— `fix(department): polish after full verification`

---

## 已裁定的次要项（评审 D 系列）

| 项 | 裁定 |
|---|---|
| D13 原空壳任务 | 并入 Task 4 |
| D14 弹窗二级导航 | Tab 内本地状态，不引入路由（Task 15） |
| D15 uuid 函数 | `uuid_generate_v4()`（Task 3） |
| D16 密码解密 | MemberCreateApi 挂 `@decrypt_password_field`（Task 10） |
| D17 i18n | 仅 zh-Hans/en-US，其余语言由 CI 翻译流程补齐（既有惯例） |
| D18 成员查看权 | 按架构文档放开本部门普通成员（Task 5） |
| D19 判定复用 | `can_access` 统一（Task 19/20/22） |
| D20 sort_order | 留字段、无 API/UI（YAGNI，注释标注） |

## 已裁定的次要项（评审 R 系列补充）

| 项 | 裁定 |
|---|---|
| R1 创建路径与 NULL 可见性 | coalesce 过滤统一语义（Task 4/11/12）+ 复制/DSL 导入补部门（Task 11） |
| R2 新端点越权 | transfer/publish 端点必须走 `@get_app_model`（Task 11/12/19） |
| R3 存量匿名 token | `decode_jwt_token` 加 flag+is_anonymous → 401（Task 22） |
| R4 试用应用 | `get_app_model_with_trial` 仅同租户校验（Task 7） |
| R5 current 缺失 | create_member_by_admin 后调 `switch_tenant`（Task 9） |
| R6 默认部门唯一性 | partial unique index + IntegrityError 重试（Task 1/3/4/5） |
| R7 安装/置顶断裂 | POST /installed-apps flag 分支允许部门应用（Task 20） |
| R8 表格截断 | 说明段落移出表格（Task 5） |
| R9 密码策略 | 强制 valid_password，记为有意偏离（Task 9） |
| R10 密码入日志 | task/日志禁记录明文（Task 9） |
| R11 guard 冗余 | 前端直接调 verify，401/403/200 分流（Task 22） |
| G1 成员数据明细 | created-resources 列表 API + 逐个转移（Task 10 后端 / Task 15 前端） |
| G2 审计读取 | DepartmentAuditLog.query + 部门/成员 operation-logs 只读 API，无 UI（Task 4/5/10/13） |
| G3 空状态 | 四类空状态补全（Task 14/15） |
| G4 卡片部门信息 | 列表响应加 department_name + 卡片面包屑（Task 11/12/17） |
| G5 迁移验证 | 迁移后四表校验 SQL（Task 3） |
| G6 响应式断点 | 继承全站响应式框架，本功能不做专属适配（偏离登记） |
| G7 删除乐观锁 | YAGNI 省略：已有五项前置检查 + 删除幂等（偏离登记） |
| G8 权限中间件 | 内联 service 校验等价实现，设计样例基于过时技术栈（偏离登记） |
| G9 迁移范围 | 默认部门仅"有成员租户"：空租户无 created_by（NOT NULL）可填，惰性创建兜底（偏离登记） |
| G10 verify 方法 | 设计 POST → 用 GET 规避 console CSRF（Task 22，偏离登记） |
| G11 文案表 | Toast/确认框文案按 Web 设计 §状态反馈/§确认对话框 实现（Task 14-16） |
| T1 邀请制回归 | 9 个受影响测试文件逐一处理 + Step 4 全量回归（Task 10） |
| T2 mail task 用例 | is_inited 两态/无明文密码/弱密码拒绝（Task 9） |
| T3 控制器层用例 | 补 DepartmentApi PUT/MemberApi PUT/AdminApi/move/transfer/publish 端点控制器测试（Task 5/6/11/12/19） |
| T4 dataset 守卫用例 | 与 app 侧同矩阵（Task 7） |
| T5 服务/模型断言 | update_department/build_tree/get_descendant_ids/manageable 矩阵/counts coalesce 一致性 + 模型索引断言（Task 1/2/4） |
| T6 created-resources service 用例 | creator 过滤/批量映射/空列表（Task 10） |
| T7 配置一致性 | docker env/模板加开关 + 重新生成 compose（Task 20） |
| T8 迁移 CI 对齐 | offline --sql/MySQL 分支/path 格式校验（Task 3/18） |
| T9 共享代码回归 | Task 5/8/19 跑受影响既有目录 |
| T10 测试质量 | coalesce 行为断言/契约逐条断言/前端门控与权限显隐用例（Task 11/13/14/16/17） |
| U1 passport/wraps 回归 | Task 22 适配既有 test_wraps/test_web_passport/test_passport + 回归目录改整目录 |
| U2 config 三方一致 | `api/.env.example` 也加开关（T7 补全） |
| U3 revoke 通知守卫 | `mail.is_inited()` False 分支用例（Task 8） |
| U4 ListApi 透传用例 | AppListApi/DatasetListApi `department_id` query 参数控制器用例（Task 11/12） |
| U5 verify 分支补齐 | `not_found` 响应与 cookie/Bearer 解析用例（Task 22） |
| U6 ruff 约定 | 后端任务 commit 前对 touched 文件跑 `ruff check --fix`（Global Constraints） |
| C1 dataset 守卫 | `DatasetService.check_dataset_permission` 末尾追加 `assert_department_access`（Task 7） |
| C2 login.py 邀请依赖 | 移除 `invite_token` 字段和验证逻辑（Task 10） |
| C3 activate.py 删除 | 整体删除两个端点 + 前端 invite-settings 路由（Task 10） |
| C4 邀请方法补删 | `get_invitation_by_token`/`get_invitation_with_case_fallback`/`get_invitation_if_token_valid` 一并删除（Task 10） |
| I1 跨租户防护 | `assert_department_access` 增加 `resource_tenant_id` 参数显式校验（Task 7） |
| I2 oauth 行号修正 | 源码 L120，测试 L228（Task 10） |
| I3 签名变更醒目 | `get_paginate_apps` 调用方同步注释（Task 11） |
| I4 config 接入路径 | `DepartmentConfig` 插入位置 + `DifyConfig` 挂载 + `SystemFeatureModel` 字段 + `_fulfill_system_params_from_env` 赋值（Task 20） |
| I5 guard cookie | 前端 `fetch(url, {credentials: 'include'})`（Task 22） |
| I6 批量查询策略 | `get_tenant_members` 先收集 department_id 再批量查部门名（Task 10） |
| I7 过滤叠加顺序 | department 过滤在 `only_me/partial` **之后** AND 叠加（Task 12） |
| I8 删除扩展点 | `delete_department` 用可扩展检查列表模式（Task 4） |
| I9 Tab 门控优先级 | admin 先判 `isCurrentWorkspaceManager`，再判 `is_department_admin`；API 失败降级（Task 14） |
| V1 前端 signin 清理 | 6+ 个 signin 组件移除 `invite_token`/`isInvite` 逻辑（Task 10） |
| V2 authenticate 清理 | 移除 `invite_token` 参数和 L196-203 密码设置分支 + `login.py:333-341` 同步（Task 10） |
| V3 路径修正 | `web/app/signin/invite-settings/`（不在 `(shareLayout)` 下） |
| V4 activate 目录删除 | `web/app/activate/`（`page.tsx` + `activateForm.tsx`）（Task 10） |
| V5 invitationCheck 清理 | `web/service/common.ts:180` + `useInvitationCheck` hook（Task 10） |
| V6 activateMember 清理 | `web/service/common.ts:184`（Task 10） |
| V7 接口签名同步 | `assert_department_access` 4 参数版本（Task 4） |
| V8 _get_invitation_token_key | 显式列入删除（Task 10） |
| V9 DatasetOperatorMemberListApi | 前端未使用，YAGNI（Task 10 不处理） |
| V10 workspace_permission 清理 | `check_workspace_member_invite_permission` 函数删除（Task 10） |
| V11 normal-form UI 清理 | `isInviteLink` 控制的 email 输入框 disabled 状态（Task 16） |

## 遗留风险提示

- 邀请制移除会改写 `test_containers_integration_tests` 中约 240 行 invite 用例（CI-only，Task 10 内处理）
- passport 的 EndUser 兼容方案与设计文档"不再创建匿名 EndUser"存在偏离（Task 22 已说明理由：避免重写全部 web 资源签名）；存量匿名 token 由 R3（decode_jwt_token 拦截）封堵
- M1-M4 的隔离在开关关闭时同样生效；迁移后全员归属默认部门，存量可见性不变，管理员再行重组
- 存量多租户账号不受邮箱全局唯一影响（仅新加入被禁止）
- `get_accessible_department_ids` 在每次成员的应用/知识库列表请求中产生 2-3 条额外查询（用户部门 + 子孙部门），且无缓存；部门树规模小、按页返回，v1 可接受。若后续租户/部门规模变大，需给"用户→可访问部门集合"加 Redis 缓存并在成员移动/部门变更时失效（本计划不做）
- 滚动部署窗口期：旧代码创建的租户可能缺默认部门；已由 Task 5 的惰性创建兜底，无需额外处理
- 未纳入部门模型管辖、不处理直查 App 的端点：`admin.py:105/206`（实例管理员面板）、`human_input_form.py:206`（表单 token 场景）——与租户部门隔离无关
- 审计日志查询仅提供后端只读 API，无前端 UI（G2 决策范围内，Web 设计本就无审计查看页面）；后续如需展示再补
- 移动成员前的"转移数据"为列表展示 + 逐个转移（G1 决策），批量转移 API 未实现（YAGNI）
- **无 E2E 自动化**：仓库无 Playwright/Cypress workflow，聊天 401 重定向/403 页/flag 关闭全链路仅组件级单测 + Task 23 手动冒烟；E2E 记 out-of-scope（T 系列裁定）
