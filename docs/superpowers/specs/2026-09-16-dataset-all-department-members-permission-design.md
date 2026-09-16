# 知识库「所有部门成员」权限设计

**日期**: 2026-09-16
**状态**: 待实现
**范围**: 知识库分享权限新增第四种：同部门全部成员可见。控制台列表、部门筛选数字、打开详情、应用/工作流检索走同一规则。
**依赖**: 现有 `DatasetPermissionEnum`、`DatasetService.sharing_visibility_filter`、`DatasetService.check_dataset_permission`、部门 ACL（`DepartmentService.get_user_department_id` / `assert_department_access`）

---

## 1. 目标

在知识库「可见权限」中新增 **所有部门成员**。选中后，知识库**当前所属部门**里的全部成员都能看到并使用该知识库。

成功标准：

1. 权限选择器出现第四项，默认仍是「只有我」；已有知识库权限不变。
2. 同部门成员（含普通、编辑、知识库操作员、该部门的部门管理员）能在知识库列表看到；部门筛选数字与列表一致。
3. 下级部门成员、上级部门管理员、已调出该部门的原创建者都看不到（租户 owner / admin 除外）。
4. 成员调岗、入职、知识库转部门后，下次请求立刻按新的所属部门计算，不写名单、不补数据。

---

## 2. 非目标

- 不改「只有我 / 所有团队成员 / 部分团队成员」的既有语义。
- 不把「所有团队成员」改成本部门可见。
- 不为上级部门管理员开例外。
- 不新增表、不写 `dataset_permissions` 同步逻辑、不做数据库迁移。
- 不改应用自身的发布/可见权限模型。
- 不改变新建知识库的默认权限。
- 调岗或转部门时不发站内通知。

---

## 3. 权限模型

知识库分享仍是单一字段 `datasets.permission`。第四种取值：

| 值 | 产品文案 | 谁能看（非特权角色） |
|---|---|---|
| `only_me` | 只有我 | 仅 `created_by` |
| `all_department_members` | 所有部门成员 | 用户当前所属部门 == 知识库当前所属部门（精确匹配） |
| `all_team_members` | 所有团队成员 | 工作空间成员，再叠加现有部门 ACL |
| `partial_members` | 部分团队成员 | `dataset_permissions` 显式名单，或创建者 |

「所有部门成员」判定只有一条：

```text
coalesce(dataset.department_id, 租户默认部门 id)
  == 当前租户 TenantAccountJoin.department_id
```

补充：

- 不含下级部门。前端组成员看不到研发部的此类知识库。
- 不含上级管理树。研发部管理员看不到前端组的此类知识库（即使部门 ACL 允许管到前端组）。
- 创建者没有例外。创建者调出该部门后看不到，除非再调回，或改成「只有我 / 部分成员」。
- 用户没有所属部门：看不到任何「所有部门成员」知识库。
- 知识库 `department_id` 为空：视为默认部门。
- 租户 owner / admin（`TenantAccountRole.is_privileged_role`）：分享层不拦截，与现在一致。
- 未登录路径：只暴露 `all_team_members`，不暴露 `all_department_members`。

可见性必须用于同一套规则：控制台列表、`get_departments_with_counts` 的 `dataset_count`、打开详情、文档/分段操作、应用与工作流检索。禁止列表一套、计数另一套。

### 3.1 与部门 ACL 的关系

两层仍都执行，顺序为：先分享，再部门 ACL。

对 `all_department_members`，分享层已要求所属部门精确相等，上级部门管理员会在分享层被拒绝，不会因为能管理子部门而看到。

对 `all_team_members`，行为不变：分享层放行后，普通成员仍只能看到自己部门的资源，部门管理员仍能看到本部门及下级。

### 3.2 知识库操作员

`dataset_operator` 对「只有我 / 所有团队成员 / 部分成员」保持现状（部分成员仍看显式名单；不能借本功能扩大「所有团队成员」）。

同部门的 `all_department_members` 知识库必须可见：他们也是该部门成员。实现上在 `sharing_visibility_filter` 的操作员分支中，把「同部门 all_department_members」与原有 `dataset_permissions` 名单做 OR，而不是只返回名单。

---

## 4. 后端

### 4.1 数据

`DatasetPermissionEnum` 增加：

```text
ALL_DEPARTMENT = "all_department_members"
```

`permission` 列是 `EnumText` / `VARCHAR(255)`，新值可直接写入，不需要 Alembic 迁移。

不新增列或表。不把部门成员展开进 `dataset_permissions`。

### 4.2 判定入口

1. `DatasetService.sharing_visibility_filter`：列表与部门筛选数字。非特权用户增加 OR 条件：`permission == all_department_members` 且部门精确匹配。无所属部门时该条件为假。
2. `DatasetService.check_dataset_permission`：打开与使用。非特权用户在现有 `only_me` / `partial_members` 判断旁增加：`all_department_members` 且部门不匹配则 `NoPermissionError`。不新造错误类型。
3. `DatasetService.check_dataset_operator_permission`：与上一条同一部门规则，避免操作员走另一套。

创建默认仍是 `only_me`。

控制台与 Service API 更新知识库时：若新权限属于 `{only_me, all_team_members, all_department_members}`，调用现有 `DatasetPermissionService.clear_partial_member_list`。从「部分成员」改过来后名单清空；再改回去不恢复旧名单。非法 `permission` 值仍由枚举校验拒绝。

人事变动（入职、调岗、知识库转部门）不挂钩同步。下次查询读当前 `department_id` 即可。

应用已绑定该知识库、使用人后来调走：列表不再出现；运行时检索同样走 `check_dataset_permission` 失败。应用不代持知识库分享。

---

## 5. 前端

`DatasetPermission` 增加 `allDepartmentMembers = 'all_department_members'`。

唯一产品入口：现有 `PermissionSelector`（知识库设置、应用内知识库配置弹窗共用）。

选项顺序（从窄到宽）：

1. 只有我
2. 所有部门成员
3. 所有团队成员
4. 部分团队成员

文案键：`form.permissionsAllDepartmentMembers`（`datasetSettings`）。中文「所有部门成员」，英文「All department members」。按仓库 i18n 规范写入全部语言文件，键名平坦且排序。

选中后收起下拉，不出现成员搜索列表。已选态显示该文案，不拼接成员名。图标用部门/组织图标，与「所有团队成员」的群组图标区分。

`hasEditPermissionForDataset`：对 `allDepartmentMembers` 返回 `true`（与 `allTeamMembers` 相同）。该辅助函数只处理已经出现在当前用户上下文中的知识库；拒绝仍由 API 执行。

列表卡片与部门筛选无新交互。筛选数字以后端 `dataset_count` 为准。

---

## 6. 测试

后端单测（扩 `sharing_visibility_filter` / `check_dataset_permission` / 操作员分支 / 更新时清空部分成员名单）：

- 同部门 editor / normal / dataset_operator / 本部门管理员：能看。
- 下级部门成员：不能看。
- 上级部门管理员：不能看。
- 创建者调到其他部门后：不能看。
- owner / admin：能看。
- 无所属部门用户：不能看。
- `department_id` 为空的知识库：按默认部门匹配。
- 部门筛选 `dataset_count` 与列表可见性一致。
- 改为 `all_department_members` 时清空 `dataset_permissions`。

前端：

- 选择器能选中新项、顺序正确、不弹出成员列表。
- `hasEditPermissionForDataset` 覆盖新枚举。

浏览器（现有 QA 账号，密码 `QaTest1234`）：

1. `qa-dept-rd-editor@dify.test` 将一份研发部知识库设为「所有部门成员」。
2. `qa-dept-rd-normal@dify.test` 在知识库列表能看到，筛选数字与列表一致。
3. `qa-dept-fe-editor@dify.test` 看不到该库。
4. `qa-dept-rd-lead@dify.test` 看不到前端组的同类知识库。
5. 列表为空时部门筛选为「全部部门 (0)」，树节点为 0。

---

## 7. 实现要点（文件）

后端：

- `api/models/dataset.py`：枚举
- `api/services/dataset_service.py`：`sharing_visibility_filter`、`check_dataset_permission`、`check_dataset_operator_permission`
- `api/controllers/console/datasets/datasets.py`、`api/controllers/service_api/dataset/dataset.py`：更新时清空部分成员名单的权限集合

前端：

- `web/models/datasets.ts`
- `web/app/components/datasets/settings/permission-selector/`
- `web/utils/permission.ts`
- `web/i18n/*/dataset-settings.json`

不改 `get_departments_with_counts` 的计数结构：它已调用 `sharing_visibility_filter`，枚举扩展后数字自动对齐。
