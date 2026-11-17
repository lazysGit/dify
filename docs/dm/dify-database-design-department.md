# Dify 部门管理系统 - 数据库设计文档

**生成日期**: 2026-07-08
**基于**: Dify Community Edition
**数据库类型**: PostgreSQL
**ORM 框架**: SQLAlchemy 2.0

---

## 目录

1. [设计决策](#设计决策)
2. [新增表：departments](#新增表departments)
3. [扩展表：tenant_account_joins](#扩展表tenant_account_joins)
4. [扩展表：apps](#扩展表apps)
5. [扩展表：datasets](#扩展表datasets)
6. [数据隔离规则](#数据隔离规则)
7. [数据迁移策略](#数据迁移策略)
8. [表关系图](#表关系图)

---

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 部门与租户关系 | 部门在租户内部 | 保持向后兼容，符合企业组织架构 |
| 用户与部门关系 | 单部门 | 数据隔离简单明确，权限逻辑清晰 |
| 部门管理员权限 | 租户角色 + 部门范围 | 保持现有权限体系，部门只是作用范围 |
| 未分配用户处理 | 默认部门 | 向后兼容，现有用户无感知 |

---

## 新增表：departments

**表名**: `departments`
**用途**: 存储租户内的部门信息，支持多级树形结构

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 部门 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `parent_id` | UUID | NULLABLE, INDEX | 父部门 ID（NULL 表示根部门） |
| `name` | VARCHAR(255) | NOT NULL | 部门名称 |
| `description` | TEXT | NULLABLE | 部门描述 |
| `path` | VARCHAR(1000) | NOT NULL | 部门路径（如 `/dept1/dept2/dept3`） |
| `level` | INTEGER | NOT NULL, DEFAULT 1 | 部门层级（根部门=1） |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | 排序权重 |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | 是否为默认部门 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**唯一约束**:
- `unique_tenant_department_name`: (tenant_id, parent_id, name) - 同一父部门下名称唯一
- 对于根部门（parent_id = NULL），同一租户下所有根部门的名称必须唯一

**索引**:
- `department_tenant_idx`: tenant_id 索引
- `department_parent_idx`: parent_id 索引
- `department_path_idx`: path 前缀索引（用于快速查询子部门）

**path 字段说明**:
- 格式：`/租户ID/根部门ID/子部门ID/孙部门ID`
- 示例：`/tenant1/abc123/def456/ghi789`
- 用途：通过 `path LIKE '/tenant1/abc123%'` 快速查询某部门的所有子部门
- 根部门示例：`/tenant1/abc123`（租户 tenant1 下的根部门 abc123）

---

## 扩展表：tenant_account_joins

**表名**: `tenant_account_joins`
**新增字段**:

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `department_id` | UUID | NULLABLE, INDEX | 部门 ID |
| `is_department_admin` | BOOLEAN | NOT NULL, DEFAULT false | 是否为部门管理员 |

**说明**:
- `department_id` 为 NULL 表示未分配部门（兼容现有数据）
- `is_department_admin` 标记用户是否为该部门的管理员
- 部门管理员的权限 = 租户角色权限 + 部门管理范围

**权限判断示例**:

```python
# 判断用户是否为部门管理员
def is_department_admin(account_id: str, department_id: str) -> bool:
    join = db.session.query(TenantAccountJoin).filter(
        TenantAccountJoin.account_id == account_id,
        TenantAccountJoin.department_id == department_id
    ).first()
    return join and join.is_department_admin


# 判断用户是否有部门级编辑权限
# 注意：只有 owner/admin/editor 角色可以成为部门管理员
# normal 和 dataset_operator 角色不能成为部门管理员
def has_department_edit_permission(account_id: str, department_id: str) -> bool:
    join = db.session.query(TenantAccountJoin).filter(
        TenantAccountJoin.account_id == account_id,
        TenantAccountJoin.department_id == department_id
    ).first()
    if not join:
        return False
    # 租户角色为 editor 及以上 + 部门管理员
    return join.role in ['owner', 'admin', 'editor'] and join.is_department_admin


# 判断用户是否可以被设置为部门管理员
# 只有 owner/admin/editor 角色可以被设置为部门管理员
def can_be_department_admin(account_id: str, tenant_id: str) -> bool:
    join = db.session.query(TenantAccountJoin).filter(
        TenantAccountJoin.account_id == account_id,
        TenantAccountJoin.tenant_id == tenant_id
    ).first()
    if not join:
        return False
    return join.role in ['owner', 'admin', 'editor']
```

---

## 扩展表：apps

**表名**: `apps`
**新增字段**:

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `department_id` | UUID | NULLABLE, INDEX | 所属部门 ID |

**新增索引**:
- `app_department_id_idx`: department_id 索引

---

## 扩展表：datasets

**表名**: `datasets`
**新增字段**:

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `department_id` | UUID | NULLABLE, INDEX | 所属部门 ID |

**新增索引**:
- `dataset_department_id_idx`: department_id 索引

---

## 数据隔离规则

### 权限矩阵

| 操作 | owner | admin | editor | normal | dataset_operator |
|------|:-----:|:-----:|:------:|:------:|:----------------:|
| 管理租户设置 | Y | Y | N | N | N |
| 邀请/移除成员 | Y | Y | N | N | N |
| 管理所有部门 | Y | Y | N | N | N |
| 管理部门结构 | Y | Y | N | N | N |
| 创建/编辑应用（本部门及子部门） | Y | Y | Y* | N | N |
| 创建/编辑知识库（本部门及子部门） | Y | Y | Y* | N | Y* |
| 使用应用（本部门） | Y | Y | Y | Y | N |
| 管理部门成员（部门管理员） | Y | Y | Y** | N | N |

*注：editor/dataset_operator 只有在被设置为部门管理员时才能管理部门及子部门的数据
**注：editor 只有在被设置为部门管理员时才能管理部门成员

### 数据隔离规则

| 角色 | 可见数据范围 | 说明 |
|------|-------------|------|
| owner/admin | 所有部门 | 可以看到和管理所有部门的数据 |
| 部门管理员 | 本部门及子部门 | 可以看到和管理本部门及所有子部门的数据和成员 |
| editor（非部门管理员） | 本部门 | 只能看到本部门的应用，可以创建/编辑 |
| normal | 本部门 | 只能看到本部门的应用，只能使用 |
| dataset_operator（非部门管理员） | 本部门 | 只能看到本部门的知识库 |

### 数据隔离查询示例

```sql
-- 场景 1: 普通成员查询本部门应用
SELECT * FROM apps
WHERE tenant_id = :tenant_id
  AND department_id = (
    SELECT department_id FROM tenant_account_joins
    WHERE tenant_id = :tenant_id AND account_id = :account_id
  )
  AND status = 'normal';

-- 场景 2: 租户管理员查询所有部门应用
SELECT * FROM apps
WHERE tenant_id = :tenant_id
  AND status = 'normal';

-- 场景 3: 租户管理员查询某部门及其子部门的应用
SELECT * FROM apps
WHERE tenant_id = :tenant_id
  AND department_id IN (
    SELECT id FROM departments
    WHERE tenant_id = :tenant_id
      AND path LIKE :department_path_pattern  -- 例如 '/tenant1/abc123%'
  )
  AND status = 'normal';

-- 场景 4: 查询部门下的所有成员
SELECT a.*, taj.role, taj.is_department_admin
FROM accounts a
JOIN tenant_account_joins taj ON a.id = taj.account_id
WHERE taj.tenant_id = :tenant_id
  AND taj.department_id = :department_id;
```

---

## 默认部门规则

1. 每个租户有且仅有一个默认部门（`is_default = true`）
2. 默认部门**不可删除**
3. 默认部门**可以重命名**
4. 新租户创建时自动创建默认部门
5. 数据迁移时，现有数据自动归属到默认部门
6. 默认部门的 `path` 格式为 `/租户ID/部门ID`
7. **默认部门不能有子部门**（前端创建部门时，父部门选择器中过滤掉默认部门）

---

## 数据迁移策略

### 迁移步骤

```sql
-- 步骤 1: 为每个租户创建默认部门
INSERT INTO departments (id, tenant_id, parent_id, name, path, level, is_default, created_by, created_at, updated_at)
SELECT
  uuid_generate_v4(),
  t.id,
  NULL,
  '默认部门',
  '/' || t.id || '/' || uuid_generate_v4(),  -- 格式: /租户ID/部门ID
  1,
  true,
  (SELECT account_id FROM tenant_account_joins WHERE tenant_id = t.id LIMIT 1),
  NOW(),
  NOW()
FROM tenants t;

-- 步骤 2: 将现有用户分配到默认部门
UPDATE tenant_account_joins taj
SET department_id = (
  SELECT d.id FROM departments d
  WHERE d.tenant_id = taj.tenant_id AND d.is_default = true
)
WHERE taj.department_id IS NULL;

-- 步骤 3: 将现有应用分配到默认部门
UPDATE apps a
SET department_id = (
  SELECT d.id FROM departments d
  WHERE d.tenant_id = a.tenant_id AND d.is_default = true
)
WHERE a.department_id IS NULL;

-- 步骤 4: 将现有知识库分配到默认部门
UPDATE datasets ds
SET department_id = (
  SELECT d.id FROM departments d
  WHERE d.tenant_id = ds.tenant_id AND d.is_default = true
)
WHERE ds.department_id IS NULL;

-- 步骤 5: 验证迁移结果
SELECT
  'departments' as table_name,
  COUNT(*) as count,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as default_count
FROM departments
UNION ALL
SELECT
  'tenant_account_joins',
  COUNT(*),
  SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END)
FROM tenant_account_joins
UNION ALL
SELECT
  'apps',
  COUNT(*),
  SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END)
FROM apps
UNION ALL
SELECT
  'datasets',
  COUNT(*),
  SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END)
FROM datasets;
```

### 回滚策略

```sql
-- 如果需要回滚，清空新增字段
UPDATE tenant_account_joins SET department_id = NULL, is_department_admin = false;
UPDATE apps SET department_id = NULL;
UPDATE datasets SET department_id = NULL;
DELETE FROM departments;
```

---

## 表关系图

```
                ┌─────────────────────────────────────────┐
                │              tenants (租户)              │
                │  id, name, plan, status                 │
                └─────────────────┬───────────────────────┘
                                  │ 1:N
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         departments (部门)                                  │
│  id, tenant_id, parent_id, name, path, level, is_default                  │
│                                                                             │
│  自关联: parent_id -> id (支持多级树形结构)                                  │
│  path 格式: /租户ID/部门ID/子部门ID (例如: /tenant1/abc123/def456)          │
│                                                                             │
│  示例结构:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  默认部门 (level=1, is_default=true, path=/tenant1/abc123)         │   │
│  │    ├── 技术部 (level=2, path=/tenant1/abc123/def456)               │   │
│  │    │     ├── 前端组 (level=3, path=/tenant1/abc123/def456/ghi789) │   │
│  │    │     └── 后端组 (level=3, path=/tenant1/abc123/def456/jkl012) │   │
│  │    ├── 产品部 (level=2, path=/tenant1/abc123/mno345)               │   │
│  │    └── 运营部 (level=2, path=/tenant1/abc123/pqr678)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │ 1:N                    │ 1:N                    │ 1:N
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ tenant_account  │    │      apps       │    │    datasets     │
│    _joins       │    │    (应用)       │    │    (知识库)     │
│ - department_id │    │ - department_id │    │ - department_id │
│ - is_dept_admin │    └─────────────────┘    └─────────────────┘
└─────────────────┘
         │ N:1
         ▼
┌─────────────────┐
│    accounts     │
│     (用户)      │
└─────────────────┘
```

---

## 总结

本文档详细描述了 Dify 部门管理系统的数据库设计，包括：

1. **设计决策**：部门与租户关系、用户与部门关系、部门管理员权限、未分配用户处理
2. **新增表：departments**：存储租户内的部门信息，支持多级树形结构
3. **扩展表：tenant_account_joins**：新增 department_id 和 is_department_admin 字段
4. **扩展表：apps**：新增 department_id 字段
5. **扩展表：datasets**：新增 department_id 字段
6. **数据隔离规则**：权限矩阵、数据隔离规则、数据隔离查询示例
7. **默认部门规则**：每个租户有且仅有一个默认部门，默认部门不能有子部门
8. **数据迁移策略**：迁移步骤、回滚策略
9. **表关系图**：展示各部门表之间的关系

**核心设计决策**：
- 部门在租户内部，保持向后兼容
- 用户与部门是单部门关系
- 部门管理员权限 = 租户角色权限 + 部门管理范围
- 默认部门用于兼容现有数据，不能有子部门
- 使用 path 字段实现快速查询子部门

---

**文档结束**
