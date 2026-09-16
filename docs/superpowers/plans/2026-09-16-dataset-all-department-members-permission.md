# 知识库「所有部门成员」权限 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 知识库可见权限新增 `all_department_members`：当前所属部门的全部成员能看见并使用该知识库，列表与筛选数字同一规则。

**Architecture:** 在现有 `DatasetPermissionEnum` 上增加第四种字符串值。列表/筛选走 `DatasetService.sharing_visibility_filter` 的 SQL 条件（`permission == all_department_members` 且 `coalesce(dataset.department_id, 默认部门) == 用户所属部门`）；打开与检索走 `check_dataset_permission` / `check_dataset_operator_permission` 的同一 Python 判断。不新增表、不写名单、不做迁移。前端只在现有 `PermissionSelector` 加一项。

**Tech Stack:** Python 3.12、Flask、SQLAlchemy、pytest（`uv run --project api`）、Next.js、Vitest、pnpm、Remix Icon。

**Spec:** `docs/superpowers/specs/2026-09-16-dataset-all-department-members-permission-design.md`

## Global Constraints

- 沟通语言：简体中文；文档与提交说明不使用 emoji
- 默认权限仍是 `only_me`；不改已有三类权限语义；不为上级部门管理员开例外
- 「同部门」精确匹配所属部门，不含下级；创建者调岗后无例外
- 租户 owner / admin（`TenantAccountRole.is_privileged_role`）分享层不拦截
- `permission` 列是 `VARCHAR(255)`，禁止为此功能写 Alembic 迁移
- 不改应用发布/可见权限模型；不把 `all_team_members` 改成本部门语义
- Python：双引号、行宽 120；命令一律 `uv run --project api ...`，在仓库根 `/home/lazylee/git/dify` 执行
- 前端：`pnpm`，测试在 `web/` 下跑；i18n 键平坦、按字母序插入
- 每个任务先写失败测试再改实现（TDD）
- 未明确要求时不要把无关的已有工作区改动混进本任务提交
- 浏览器验证必须真实点击登录与设置，不能只看截图

---

## File map

| 文件 | 职责 |
|------|------|
| `api/models/dataset.py` | `DatasetPermissionEnum.ALL_DEPARTMENT = "all_department_members"` |
| `api/services/dataset_service.py` | `_department_members_clause`、`user_in_dataset_department`、扩展 `sharing_visibility_filter` / `check_dataset_permission` / `check_dataset_operator_permission` |
| `api/controllers/console/datasets/datasets.py` | 更新权限为部门共享时清空 `dataset_permissions` |
| `api/controllers/service_api/dataset/dataset.py` | 同上（Service API） |
| `api/tests/unit_tests/services/test_dataset_service_department.py` | 筛选 SQL 与同部门判断单测 |
| `api/tests/unit_tests/services/test_dataset_department_guard.py` | 打开权限单测 |
| `api/tests/unit_tests/controllers/console/datasets/test_datasets.py` | PATCH 清空部分成员 |
| `api/tests/unit_tests/controllers/service_api/dataset/test_dataset.py` | 枚举值存在 |
| `web/models/datasets.ts` | `DatasetPermission.allDepartmentMembers` |
| `web/utils/permission.ts` | 客户端可编辑判断 |
| `web/utils/permission.spec.ts` | 对应单测 |
| `web/app/components/datasets/settings/permission-selector/index.tsx` | 下拉第四项 |
| `web/app/components/datasets/settings/permission-selector/__tests__/index.spec.tsx` | 选择器单测 |
| `web/i18n/*/dataset-settings.json` | `form.permissionsAllDepartmentMembers` |

不改 `get_departments_with_counts`：它已调用 `sharing_visibility_filter`。

---

### Task 1: 枚举 + 列表/筛选 SQL

**Files:**
- Modify: `api/models/dataset.py`（`DatasetPermissionEnum`）
- Modify: `api/services/dataset_service.py`（`sharing_visibility_filter` 及其辅助方法）
- Modify: `api/tests/unit_tests/services/test_dataset_service_department.py`
- Modify: `api/tests/unit_tests/controllers/service_api/dataset/test_dataset.py`（枚举存在性）

**Interfaces:**
- Consumes: 现有 `sharing_visibility_filter(user, tenant_id, include_all=False)`、`DepartmentService.get_user_department_id` / `get_default_department`
- Produces:
  - `DatasetPermissionEnum.ALL_DEPARTMENT` 值为 `"all_department_members"`
  - `DatasetService.user_in_dataset_department(user: Any, dataset: Any, tenant_id: str) -> bool`
  - `DatasetService._department_members_clause(user: Any, tenant_id: str | None)` → SQLAlchemy 条件（无所属部门时为 `sa.false()`）
  - `sharing_visibility_filter` 对非特权用户 OR 上部门条件；`dataset_operator` 为「部门条件 OR 原有名单」，不再在无名单时直接 `sa.false()`

- [ ] **Step 1: 写失败测试**

在 `api/tests/unit_tests/controllers/service_api/dataset/test_dataset.py` 里、`class TestDatasetErrors` 之前新增独立 class（不要塞进 `DocumentStatusApi` 测试类）：

```python
class TestDatasetPermissionEnumValues:
    def test_all_department_permission(self):
        assert DatasetPermissionEnum.ALL_DEPARTMENT == "all_department_members"
```

在 `api/tests/unit_tests/services/test_dataset_service_department.py` 的 `TestSharingVisibilityFilter` 中追加（沿用文件里已有的 `_make_user`）：

```python
    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_editor_filter_includes_all_department_members(self, mock_db, mock_dept_service):
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []
        mock_dept_service.get_user_department_id.return_value = "d-rd"
        default_dept = MagicMock()
        default_dept.id = "d-default"
        mock_dept_service.get_default_department.return_value = default_dept
        user = _make_user(role=TenantAccountRole.EDITOR, is_admin_or_owner=False)

        clause = DatasetService.sharing_visibility_filter(user, "t1")
        compiled = str(clause.compile(compile_kwargs={"literal_binds": True})).lower()
        assert "all_department_members" in compiled
        assert "d-rd" in compiled
        assert "only_me" in compiled
        assert "all_team_members" in compiled

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_operator_filter_includes_same_department_without_partial_list(self, mock_db, mock_dept_service):
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []
        mock_dept_service.get_user_department_id.return_value = "d-rd"
        default_dept = MagicMock()
        default_dept.id = "d-default"
        mock_dept_service.get_default_department.return_value = default_dept
        user = _make_user(role=TenantAccountRole.DATASET_OPERATOR, is_admin_or_owner=False)

        clause = DatasetService.sharing_visibility_filter(user, "t1")
        compiled = str(clause.compile(compile_kwargs={"literal_binds": True})).lower()
        assert "all_department_members" in compiled
        assert "d-rd" in compiled
        assert "all_team_members" not in compiled

    @patch("services.department_service.DepartmentService")
    @patch("services.dataset_service.db")
    def test_no_user_department_omits_department_match_id(self, mock_db, mock_dept_service):
        mock_db.session.query.return_value.filter_by.return_value.all.return_value = []
        mock_dept_service.get_user_department_id.return_value = None
        user = _make_user(role=TenantAccountRole.EDITOR, is_admin_or_owner=False)

        clause = DatasetService.sharing_visibility_filter(user, "t1")
        compiled = str(clause.compile(compile_kwargs={"literal_binds": True})).lower()
        assert "all_team_members" in compiled
        mock_dept_service.get_default_department.assert_not_called()

    @patch("services.department_service.DepartmentService")
    def test_user_in_dataset_department_exact_match_and_default(self, mock_dept_service):
        mock_dept_service.get_user_department_id.return_value = "d-rd"
        default_dept = MagicMock()
        default_dept.id = "d-default"
        mock_dept_service.get_default_department.return_value = default_dept
        user = _make_user()
        same = _make_dataset(department_id="d-rd")
        other = _make_dataset(department_id="d-fe")
        unset = _make_dataset(department_id=None)

        assert DatasetService.user_in_dataset_department(user, same, "t1") is True
        assert DatasetService.user_in_dataset_department(user, other, "t1") is False
        assert DatasetService.user_in_dataset_department(user, unset, "t1") is False

        mock_dept_service.get_user_department_id.return_value = "d-default"
        assert DatasetService.user_in_dataset_department(user, unset, "t1") is True

    @patch("services.department_service.DepartmentService")
    def test_user_in_dataset_department_false_without_membership(self, mock_dept_service):
        mock_dept_service.get_user_department_id.return_value = None
        user = _make_user()
        dataset = _make_dataset(department_id="d-rd")
        assert DatasetService.user_in_dataset_department(user, dataset, "t1") is False
        mock_dept_service.get_default_department.assert_not_called()
```

- [ ] **Step 2: 跑测试确认失败**

```bash
uv run --project api pytest \
  api/tests/unit_tests/controllers/service_api/dataset/test_dataset.py::TestDatasetPermissionEnumValues \
  api/tests/unit_tests/services/test_dataset_service_department.py::TestSharingVisibilityFilter \
  -q --tb=short
```

Expected: `ALL_DEPARTMENT` 属性错误；`user_in_dataset_department` 不存在；editor/operator 编译 SQL 不含 `all_department_members`。

- [ ] **Step 3: 最小实现**

`api/models/dataset.py` 的枚举改为：

```python
class DatasetPermissionEnum(enum.StrEnum):
    ONLY_ME = "only_me"
    ALL_TEAM = "all_team_members"
    PARTIAL_TEAM = "partial_members"
    ALL_DEPARTMENT = "all_department_members"
```

在 `DatasetService.sharing_visibility_filter` **之前**插入两个静态方法，然后改 `sharing_visibility_filter` 本体（保留 privileged / partial 名单逻辑）：

```python
    @staticmethod
    def user_in_dataset_department(user: Any, dataset: Any, tenant_id: str) -> bool:
        from services.department_service import DepartmentService

        user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        if not user_dept_id:
            return False
        default_dept_id = DepartmentService.get_default_department(tenant_id).id
        return user_dept_id == (dataset.department_id or default_dept_id)

    @staticmethod
    def _department_members_clause(user: Any, tenant_id: str | None):
        from services.department_service import DepartmentService

        if not tenant_id:
            return sa.false()
        user_dept_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        if not user_dept_id:
            return sa.false()
        default_dept_id = DepartmentService.get_default_department(tenant_id).id
        return sa.and_(
            Dataset.permission == DatasetPermissionEnum.ALL_DEPARTMENT,
            func.coalesce(Dataset.department_id, default_dept_id) == user_dept_id,
        )

    @staticmethod
    def sharing_visibility_filter(user: Any, tenant_id: str | None, include_all: bool = False):
        if user is None:
            return None
        if TenantAccountRole.is_privileged_role(user.current_role) and include_all:
            return None

        dataset_permission = (
            db.session.query(DatasetPermission).filter_by(account_id=user.id, tenant_id=tenant_id).all()
        )
        permitted_dataset_ids = {dp.dataset_id for dp in dataset_permission} if dataset_permission else None
        department_clause = DatasetService._department_members_clause(user, tenant_id)

        if user.current_role == TenantAccountRole.DATASET_OPERATOR:
            if permitted_dataset_ids:
                return sa.or_(department_clause, Dataset.id.in_(permitted_dataset_ids))
            return department_clause

        if permitted_dataset_ids:
            return sa.or_(
                Dataset.permission == DatasetPermissionEnum.ALL_TEAM,
                sa.and_(Dataset.permission == DatasetPermissionEnum.ONLY_ME, Dataset.created_by == user.id),
                sa.and_(
                    Dataset.permission == DatasetPermissionEnum.PARTIAL_TEAM,
                    Dataset.id.in_(permitted_dataset_ids),
                ),
                department_clause,
            )
        return sa.or_(
            Dataset.permission == DatasetPermissionEnum.ALL_TEAM,
            sa.and_(Dataset.permission == DatasetPermissionEnum.ONLY_ME, Dataset.created_by == user.id),
            department_clause,
        )
```

未登录的 `get_datasets` 分支保持 `Dataset.permission == ALL_TEAM`，不要改成包含 `ALL_DEPARTMENT`。

- [ ] **Step 4: 跑测试确认通过**

```bash
uv run --project api pytest \
  api/tests/unit_tests/services/test_dataset_service_department.py \
  api/tests/unit_tests/controllers/service_api/dataset/test_dataset.py::TestDatasetPermissionEnumValues \
  -q --tb=short
```

Expected: PASS（含原有 sharing / 部门列表用例）。

- [ ] **Step 5: Commit**

```bash
git add api/models/dataset.py api/services/dataset_service.py \
  api/tests/unit_tests/services/test_dataset_service_department.py \
  api/tests/unit_tests/controllers/service_api/dataset/test_dataset.py
git commit -m "$(cat <<'EOF'
feat(dataset): filter all_department_members by current department

EOF
)"
```

---

### Task 2: 打开与操作员校验

**Files:**
- Modify: `api/services/dataset_service.py`（`check_dataset_permission`、`check_dataset_operator_permission`）
- Modify: `api/tests/unit_tests/services/test_dataset_department_guard.py`

**Interfaces:**
- Consumes: `DatasetService.user_in_dataset_department(user, dataset, tenant_id) -> bool`、`DatasetPermissionEnum.ALL_DEPARTMENT`
- Produces: 非特权用户访问 `all_department_members` 时，部门不匹配则 `NoPermissionError`；特权角色仍跳过分享层；操作员方法使用同一 `user_in_dataset_department`

- [ ] **Step 1: 写失败测试**

追加到 `api/tests/unit_tests/services/test_dataset_department_guard.py`：

```python
class TestCheckDatasetPermissionAllDepartment:
    def test_same_department_member_allowed(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-rd",
            created_by="other-user",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DatasetService, "user_in_dataset_department", return_value=True),
            patch.object(DepartmentService, "assert_department_access", return_value=None),
        ):
            DatasetService.check_dataset_permission(dataset, user)

    def test_other_department_denied_before_acl(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-fe",
            created_by="u1",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DatasetService, "user_in_dataset_department", return_value=False),
            patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_acl,
        ):
            with pytest.raises(NoPermissionError, match="You do not have permission"):
                DatasetService.check_dataset_permission(dataset, user)
            mock_acl.assert_not_called()

    def test_parent_department_admin_denied(self) -> None:
        user = _make_user(role=TenantAccountRole.EDITOR)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-fe",
            created_by="other-user",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DepartmentService, "is_department_admin", return_value=True),
            patch.object(DatasetService, "user_in_dataset_department", return_value=False),
            patch.object(DepartmentService, "assert_department_access", return_value=None) as mock_acl,
        ):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_permission(dataset, user)
            mock_acl.assert_not_called()

    def test_privileged_skips_department_sharing(self) -> None:
        user = _make_user(role=TenantAccountRole.ADMIN)
        dataset = _make_dataset(
            permission=DatasetPermissionEnum.ALL_DEPARTMENT,
            department_id="d-fe",
            created_by="other-user",
        )
        from services.department_service import DepartmentService

        with (
            patch.object(DatasetService, "user_in_dataset_department") as mock_same,
            patch.object(DepartmentService, "assert_department_access", return_value=None),
        ):
            DatasetService.check_dataset_permission(dataset, user)
            mock_same.assert_not_called()


class TestCheckDatasetOperatorPermissionAllDepartment:
    def test_operator_same_department_allowed(self) -> None:
        user = _make_user(role=TenantAccountRole.DATASET_OPERATOR)
        dataset = _make_dataset(permission=DatasetPermissionEnum.ALL_DEPARTMENT, department_id="d-rd")
        with patch.object(DatasetService, "user_in_dataset_department", return_value=True):
            DatasetService.check_dataset_operator_permission(user=user, dataset=dataset)

    def test_operator_other_department_denied(self) -> None:
        user = _make_user(role=TenantAccountRole.DATASET_OPERATOR)
        dataset = _make_dataset(permission=DatasetPermissionEnum.ALL_DEPARTMENT, department_id="d-fe")
        with patch.object(DatasetService, "user_in_dataset_department", return_value=False):
            with pytest.raises(NoPermissionError):
                DatasetService.check_dataset_operator_permission(user=user, dataset=dataset)
```

- [ ] **Step 2: 跑测试确认失败**

```bash
uv run --project api pytest \
  api/tests/unit_tests/services/test_dataset_department_guard.py::TestCheckDatasetPermissionAllDepartment \
  api/tests/unit_tests/services/test_dataset_department_guard.py::TestCheckDatasetOperatorPermissionAllDepartment \
  -q --tb=short
```

Expected: FAIL。`other_department_denied_before_acl` 会落到部门 ACL 并放行（mock 了 `assert_department_access`），因为现有代码对 `ALL_DEPARTMENT` 没有分享判断。

- [ ] **Step 3: 最小实现**

`check_dataset_permission` 非特权块里，在 `PARTIAL_TEAM` 判断之后增加：

```python
            if dataset.permission == DatasetPermissionEnum.ALL_DEPARTMENT:
                if not DatasetService.user_in_dataset_department(user, dataset, user.current_tenant_id):
                    logger.debug("User %s does not have permission to access dataset %s", user.id, dataset.id)
                    raise NoPermissionError("You do not have permission to access this dataset.")
```

`check_dataset_operator_permission` 非特权块改为覆盖三种分享（保留 `ONLY_ME` / `PARTIAL_TEAM`，新增部门）：

```python
        if not TenantAccountRole.is_privileged_role(user.current_role):
            if dataset.permission == DatasetPermissionEnum.ONLY_ME:
                if dataset.created_by != user.id:
                    raise NoPermissionError("You do not have permission to access this dataset.")

            elif dataset.permission == DatasetPermissionEnum.PARTIAL_TEAM:
                if not any(
                    dp.dataset_id == dataset.id
                    for dp in db.session.query(DatasetPermission).filter_by(account_id=user.id).all()
                ):
                    raise NoPermissionError("You do not have permission to access this dataset.")

            elif dataset.permission == DatasetPermissionEnum.ALL_DEPARTMENT:
                if not DatasetService.user_in_dataset_department(user, dataset, user.current_tenant_id):
                    raise NoPermissionError("You do not have permission to access this dataset.")
```

错误文案必须仍是 `"You do not have permission to access this dataset."`。

- [ ] **Step 4: 跑测试确认通过**

```bash
uv run --project api pytest \
  api/tests/unit_tests/services/test_dataset_department_guard.py \
  -q --tb=short
```

Expected: PASS（含原有 ONLY_ME / 租户不匹配用例）。

- [ ] **Step 5: Commit**

```bash
git add api/services/dataset_service.py api/tests/unit_tests/services/test_dataset_department_guard.py
git commit -m "$(cat <<'EOF'
feat(dataset): deny all_department_members across departments

EOF
)"
```

---

### Task 3: 改权限时清空部分成员名单

**Files:**
- Modify: `api/controllers/console/datasets/datasets.py`（PATCH 清空集合）
- Modify: `api/controllers/service_api/dataset/dataset.py`（PATCH 清空集合）
- Modify: `api/tests/unit_tests/controllers/console/datasets/test_datasets.py`

**Interfaces:**
- Consumes: `DatasetPermissionEnum.ALL_DEPARTMENT`、`DatasetPermissionService.clear_partial_member_list`
- Produces: PATCH `permission in {ONLY_ME, ALL_TEAM, ALL_DEPARTMENT}` 时清空名单

- [ ] **Step 1: 写失败测试**

在 `TestDatasetApiPatch`（或现有 `test_patch_clear_partial_members` 旁边）增加，结构复制 `test_patch_clear_partial_members`，只改 permission：

```python
    def test_patch_all_department_members_clears_partial_list(self, app):
        api = DatasetApi()
        method = unwrap(api.patch)

        dataset_id = "dataset-id"
        payload = {"permission": "all_department_members"}

        dataset = MagicMock()
        dataset.id = dataset_id
        dataset.permission = "all_department_members"
        dataset.indexing_technique = "economy"
        dataset.embedding_model_provider = None
        dataset.embedding_available = True
        dataset.built_in_field_enabled = False
        dataset.is_published = False
        dataset.enable_api = False
        dataset.is_multimodal = False
        dataset.documents = []
        dataset.retrieval_model_dict = {}
        dataset.tags = []
        dataset.external_knowledge_info = None
        dataset.external_retrieval_model = None
        dataset.doc_metadata = []
        dataset.icon_info = None
        dataset.summary_index_setting = MagicMock()
        dataset.summary_index_setting.enable = False

        with (
            app.test_request_context(f"/datasets/{dataset_id}"),
            patch.object(type(console_ns), "payload", payload),
            patch(
                "controllers.console.datasets.datasets.current_account_with_tenant",
                return_value=(MagicMock(), "tenant"),
            ),
            patch.object(DatasetService, "get_dataset", return_value=dataset),
            patch.object(DatasetPermissionService, "check_permission", return_value=None),
            patch.object(DatasetService, "update_dataset", return_value=dataset),
            patch.object(DatasetPermissionService, "clear_partial_member_list", return_value=None) as mock_clear,
            patch.object(DatasetPermissionService, "get_dataset_partial_member_list", return_value=[]),
        ):
            result, _ = method(api, dataset_id)

        mock_clear.assert_called_once_with(dataset_id)
        assert result["partial_member_list"] == []
```

- [ ] **Step 2: 跑测试确认失败**

```bash
uv run --project api pytest \
  api/tests/unit_tests/controllers/console/datasets/test_datasets.py::TestDatasetApiPatch::test_patch_all_department_members_clears_partial_list \
  -q --tb=short
```

Expected: FAIL，`clear_partial_member_list` 未被调用（当前集合只有 `ONLY_ME` 和 `ALL_TEAM`）。若 class 名不同，用文件中 `test_patch_clear_partial_members` 所在 class。

- [ ] **Step 3: 最小实现**

两处集合都改成（console 约 542 行，service API 约 363 行）：

```python
        elif payload.permission in {
            DatasetPermissionEnum.ONLY_ME,
            DatasetPermissionEnum.ALL_TEAM,
            DatasetPermissionEnum.ALL_DEPARTMENT,
        }:
            DatasetPermissionService.clear_partial_member_list(dataset_id_str)
```

注释改成：clear partial member list when permission is only_me, all_team_members, or all_department_members。

- [ ] **Step 4: 跑测试确认通过**

```bash
uv run --project api pytest \
  api/tests/unit_tests/controllers/console/datasets/test_datasets.py::TestDatasetApiPatch \
  -q --tb=short
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add api/controllers/console/datasets/datasets.py \
  api/controllers/service_api/dataset/dataset.py \
  api/tests/unit_tests/controllers/console/datasets/test_datasets.py
git commit -m "$(cat <<'EOF'
feat(dataset): clear partial members on department sharing

EOF
)"
```

---

### Task 4: 前端枚举与可编辑辅助函数

**Files:**
- Modify: `web/models/datasets.ts`
- Modify: `web/utils/permission.ts`
- Modify: `web/utils/permission.spec.ts`

**Interfaces:**
- Consumes: 无后端类型，字符串必须是 `'all_department_members'`
- Produces: `DatasetPermission.allDepartmentMembers`；`hasEditPermissionForDataset` 对该枚举返回 `true`

- [ ] **Step 1: 写失败测试**

在 `web/utils/permission.spec.ts` 的 `allTeamMembers` 用例后追加：

```typescript
    it('returns true when permission is allDepartmentMembers for any user', () => {
      const config = {
        createdBy: creatorId,
        partialMemberList: [],
        permission: DatasetPermission.allDepartmentMembers,
      }
      expect(hasEditPermissionForDataset(userId, config)).toBe(true)
      expect(hasEditPermissionForDataset(otherUserId, config)).toBe(true)
      expect(hasEditPermissionForDataset(creatorId, config)).toBe(true)
    })
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd web && pnpm exec vitest run utils/permission.spec.ts
```

Expected: FAIL（`allDepartmentMembers` 不存在，或函数落到 `return false`）。

- [ ] **Step 3: 最小实现**

`web/models/datasets.ts`：

```typescript
export enum DatasetPermission {
  onlyMe = 'only_me',
  allTeamMembers = 'all_team_members',
  partialMembers = 'partial_members',
  allDepartmentMembers = 'all_department_members',
}
```

`web/utils/permission.ts` 在 `allTeamMembers` 分支后增加：

```typescript
  if (permission === DatasetPermission.allTeamMembers)
    return true
  if (permission === DatasetPermission.allDepartmentMembers)
    return true
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd web && pnpm exec vitest run utils/permission.spec.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add web/models/datasets.ts web/utils/permission.ts web/utils/permission.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): add allDepartmentMembers dataset permission enum

EOF
)"
```

---

### Task 5: 选择器与 i18n

**Files:**
- Modify: `web/app/components/datasets/settings/permission-selector/index.tsx`
- Modify: `web/app/components/datasets/settings/permission-selector/__tests__/index.spec.tsx`
- Modify: `web/i18n/*/dataset-settings.json`（23 个文件）

**Interfaces:**
- Consumes: `DatasetPermission.allDepartmentMembers`
- Produces: 下拉顺序为 只有我 → 所有部门成员 → 所有团队成员 → 部分团队成员；选中后关闭且不渲染成员列表；文案键 `form.permissionsAllDepartmentMembers`

- [ ] **Step 1: 写失败测试**

在 `web/app/components/datasets/settings/permission-selector/__tests__/index.spec.tsx` 追加：

```typescript
    it('should render All Department Members option when permission is allDepartmentMembers', () => {
      render(<PermissionSelector {...defaultProps} permission={DatasetPermission.allDepartmentMembers} />)
      expect(screen.getByText(/form\.permissionsAllDepartmentMembers/)).toBeInTheDocument()
    })

    it('should call onChange with allDepartmentMembers when All Department Members is selected', async () => {
      const handleChange = vi.fn()
      render(<PermissionSelector {...defaultProps} onChange={handleChange} />)

      const trigger = screen.getByText(/form\.permissionsOnlyMe/)
      fireEvent.click(trigger)

      await waitFor(() => {
        const options = screen.getAllByText(/form\.permissionsAllDepartmentMembers/)
        fireEvent.click(options[0])
      })

      expect(handleChange).toHaveBeenCalledWith(DatasetPermission.allDepartmentMembers)
    })

    it('should not show member list when allDepartmentMembers is selected', () => {
      render(
        <PermissionSelector
          {...defaultProps}
          permission={DatasetPermission.allDepartmentMembers}
        />,
      )
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
    })
```

把「All Department Members is selected」放进现有 `describe('Permission Selection')`；渲染与成员列表用例分别放进 `Rendering` / `Member Selection`。

- [ ] **Step 2: 跑测试确认失败**

```bash
cd web && pnpm exec vitest run app/components/datasets/settings/permission-selector/__tests__/index.spec.tsx
```

Expected: FAIL，trigger/选项找不到 `form.permissionsAllDepartmentMembers`。

- [ ] **Step 3: 最小实现**

`index.tsx` 增加 `RiBuildingLine` 导入（与 `RiGroup2Line` 并列）：

```typescript
import { RiArrowDownSLine, RiBuildingLine, RiGroup2Line, RiLock2Line } from '@remixicon/react'
```

在 `onSelectAllMembers` 旁增加：

```typescript
  const onSelectAllDepartmentMembers = useCallback(() => {
    onChange(DatasetPermission.allDepartmentMembers)
    setOpen(false)
  }, [onChange])
```

增加 `const isAllDepartmentMembers = permission === DatasetPermission.allDepartmentMembers`。

已选态：在 `isOnlyMe` 块和 `isAllTeamMembers` 块之间插入：

```tsx
            {
              isAllDepartmentMembers && (
                <>
                  <div className="flex size-6 shrink-0 items-center justify-center">
                    <RiBuildingLine className="size-4 text-text-secondary" />
                  </div>
                  <div className="system-sm-regular grow p-1 text-components-input-text-filled">
                    {t('form.permissionsAllDepartmentMembers', { ns: 'datasetSettings' })}
                  </div>
                </>
              )
            }
```

下拉选项：Only me 之后、All team members 之前插入：

```tsx
              <Item
                leftIcon={(
                  <div className="flex size-6 shrink-0 items-center justify-center">
                    <RiBuildingLine className="size-4 text-text-secondary" />
                  </div>
                )}
                text={t('form.permissionsAllDepartmentMembers', { ns: 'datasetSettings' })}
                onClick={onSelectAllDepartmentMembers}
                isSelected={isAllDepartmentMembers}
              />
```

成员搜索仍只在 `isPartialMembers` 时渲染，不要把 `isAllDepartmentMembers` 加进去。

每个 `web/i18n/<locale>/dataset-settings.json` 在 `"form.permissionsAllMember"` **之前**插入一行（键名字母序：`AllDepartmentMembers` < `AllMember`）：

| locale | 值 |
|--------|-----|
| zh-Hans | 所有部门成员 |
| zh-Hant | 所有部門成員 |
| en-US | All department members |
| ja-JP | 全部門のメンバー |
| ko-KR | 모든 부서 구성원 |
| de-DE | Alle Abteilungsmitglieder |
| fr-FR | Tous les membres du département |
| es-ES | Todos los miembros del departamento |
| pt-BR | Todos os membros do departamento |
| it-IT | Tutti i membri del dipartimento |
| ru-RU | Все участники отдела |
| uk-UA | Усі члени відділу |
| pl-PL | Wszyscy członkowie działu |
| nl-NL | Alle afdelingsleden |
| tr-TR | Tüm departman üyeleri |
| vi-VN | Tất cả thành viên phòng ban |
| th-TH | สมาชิกแผนกทั้งหมด |
| id-ID | Semua anggota departemen |
| hi-IN | सभी विभाग सदस्य |
| ar-TN | جميع أعضاء القسم |
| fa-IR | همه اعضای دپارتمان |
| sl-SI | Vsi člani oddelka |
| ro-RO | Toți membrii departamentului |

zh-Hans 插入后片段：

```json
  "form.permissions": "可见权限",
  "form.permissionsAllDepartmentMembers": "所有部门成员",
  "form.permissionsAllMember": "所有团队成员",
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd web && pnpm exec vitest run app/components/datasets/settings/permission-selector/__tests__/index.spec.tsx
```

Expected: PASS。若 `queryByPlaceholderText(/search/i)` 误伤，改成断言没有 `form.onSearchResults` 且没有 `John Doe` 邮箱行。

- [ ] **Step 5: Commit**

```bash
git add web/app/components/datasets/settings/permission-selector/index.tsx \
  web/app/components/datasets/settings/permission-selector/__tests__/index.spec.tsx \
  web/i18n
git commit -m "$(cat <<'EOF'
feat(web): add all department members dataset permission option

EOF
)"
```

---

### Task 6: 浏览器验收

**Files:**
- 无代码。对照 spec 第 6 节用本机 `http://localhost:3000`。

**Interfaces:**
- Consumes: Task 1–5 已合并的后端筛选 + 选择器
- Produces: 可勾选的验收记录（本任务不提交代码）

前置：`dev/status-dev-env` 显示 API :5001、Web :3000；QA 密码 `QaTest1234`。Flask 需已加载 Task 1–3。若知识库列表仍无「所有部门成员」，先确认前端已热更新。

- [x] **Step 1: 研发编辑设置权限**

1. 登出后用 `qa-dept-rd-editor@dify.test` 登录。
2. 打开知识库，进入一份**研发部**知识库设置（若没有可见库，用该账号新建，默认「只有我」，再改权限）。
3. 可见权限选 **所有部门成员** 并保存。
4. 回到列表，该库仍可见，部门筛选数字至少为 1。

- [x] **Step 2: 同部门普通成员能看**

1. 换成 `qa-dept-rd-normal@dify.test`。
2. 知识库列表出现刚才那份库。
3. 打开详情不报无权限。
4. 「全部部门」数字与列表条数一致（不含创建入口卡片）。

- [x] **Step 3: 下级部门不能看**

1. 换成 `qa-dept-fe-editor@dify.test`。
2. 列表中没有那份研发部「所有部门成员」库。

- [x] **Step 4: 上级部门管理员不能看子部门同类库**

1. 用 `qa-dept-fe-editor@dify.test`（或前端组管理员 `qa-dept-fe-lead@dify.test`）把一份**前端组**知识库设为「所有部门成员」。
2. 换成 `qa-dept-rd-lead@dify.test`。
3. 列表中没有该前端组库（即使部门管理能管到前端组）。

- [x] **Step 5: 空列表数字为 0**

若当前账号没有任何可见知识库：筛选为「全部部门 (0)」，树节点为 `(0)`。与先前「列表空但仍显示数字」的回归一致。

失败则回到对应 Task 的单测，禁止只改前端文案来“对齐”数字。

浏览器记录（2026-09-16）：研发部库 `66e98f99-e4fc-470a-8c1e-5f62e24c5770`，前端组库 `0f637779-06cc-4b31-9ff2-fc800444a89d`。Step 2 的 `qa-dept-rd-normal` 是 `normal` 角色，控制台无知识库入口（既有 `DatasetNav` 限制）；`GET /datasets` 返回该库且部门计数为 1。Step 3–5 在知识库列表完成。


---

## Spec coverage (self-review)

| Spec 要求 | 任务 |
|-----------|------|
| 枚举 `all_department_members`、无迁移 | Task 1 |
| 精确匹配所属部门、实时跟随、创建者无例外 | Task 1 `user_in_dataset_department` + Task 2 |
| 列表与 `dataset_count` 同一 `sharing_visibility_filter` | Task 1（计数函数不改） |
| 未登录只暴露 `all_team_members` | Task 1 明确不改 `get_datasets` 无 user 分支 |
| dataset_operator 同部门可见、不扩大 all_team | Task 1 operator 分支 + Task 2 |
| owner/admin 分享层不拦截 | Task 1 include_all / Task 2 privileged skip |
| 上级部门管理员不能看 | Task 2 `parent_department_admin_denied` + Task 6 Step 4 |
| 默认仍 only_me | 无创建路径改动 |
| 改权限清空部分成员名单 | Task 3 |
| 选择器顺序、文案、无成员列表 | Task 5 |
| `hasEditPermissionForDataset` | Task 4 |
| 浏览器 QA 账号矩阵 | Task 6 |
| 不改应用权限模型、不改 all_team 语义 | 全局约束，无对应改动文件 |
