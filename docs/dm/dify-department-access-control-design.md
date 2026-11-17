# Dify 部门管理系统 - 应用访问权限控制设计文档

**生成日期**: 2026-07-26
**基于**: Dify Community Edition
**依赖**: dify-database-design-department.md, dify-department-system-architecture.md, dify-department-business-flow.md

---

## 目录

1. [需求概述](#需求概述)
2. [设计决策](#设计决策)
3. [数据库设计](#数据库设计)
4. [探索模块查询流程](#探索模块查询流程)
5. [应用发布管理流程](#应用发布管理流程)
6. [聊天 URL 鉴权流程](#聊天-url-鉴权流程)
7. [权限矩阵](#权限矩阵)
8. [边界规则](#边界规则)
9. [API 接口设计](#api-接口设计)
10. [与现有系统的关系](#与现有系统的关系)

---

## 需求概述

基于现有部门管理系统，新增应用访问权限控制能力：

1. **探索模块部门过滤**：用户只能看到发布到自己所属部门的应用
2. **应用发布部门选择**：应用发布时选择目标部门，决定哪些部门可以使用
3. **聊天 URL 鉴权**：访问应用聊天 URL 必须登录，并校验部门权限

**核心原则**：发布 = 授予使用权，不授予管理/编辑权。管理权限仍按原有逻辑（应用所属部门 + 角色）。

---

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 探索模块数据来源 | 发布机制 + 安装机制结合 | 发布决定可见性，安装保留用于收藏/置顶 |
| 部门选择粒度 | 多选部门，自由组合 | 灵活度高，发布者按需勾选 |
| 聊天 URL 鉴权方式 | 复用控制台账号体系 | 统一认证，无需额外登录系统 |
| 发布流程定位 | 独立于 enable_site | 两者正交：enable_site 控制开关，发布控制范围 |
| 发布操作权限 | 有编辑权限即可（owner/admin/editor） | 与应用管理权限一致，降低操作门槛 |
| 取消发布后已安装记录 | 静默过滤 | 查询时 JOIN 过滤，无需删除逻辑，容错性好 |
| 数据存储方案 | 多对多关联表 | 双向查询高效，符合现有设计范式 |

---

## 数据库设计

### 新增表：app_published_departments

**表名**: `app_published_departments`
**用途**: 记录应用发布到哪些部门（多对多关联）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 记录 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `department_id` | UUID | NOT NULL, INDEX | 目标部门 ID |
| `published_by` | UUID | NOT NULL | 发布者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 发布时间 |

**唯一约束**:
- `unique_app_department_publish`: (app_id, department_id) — 同一应用不能重复发布到同一部门

**索引**:
- `app_published_dept_app_idx`: app_id（查某应用发布到了哪些部门）
- `app_published_dept_dept_idx`: department_id（查某部门有哪些已发布应用）

### DDL

```sql
CREATE TABLE app_published_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL,
    department_id UUID NOT NULL,
    published_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_app_department_publish UNIQUE (app_id, department_id)
);

CREATE INDEX app_published_dept_app_idx ON app_published_departments (app_id);
CREATE INDEX app_published_dept_dept_idx ON app_published_departments (department_id);
```

### 现有表无需修改

| 表 | 保留字段 | 用途 |
|----|---------|------|
| `apps` | `enable_site` | 控制站点是否可访问（URL 是否生效） |
| `apps` | `department_id` | 控制应用的管理/编辑归属 |
| `installed_apps` | 全部 | 用于个人收藏/置顶 |

### 权限关系模型

```
应用的"管理权" --> 由 apps.department_id + 用户角色决定（现有逻辑不变）
应用的"使用权" --> 由 app_published_departments 决定（新增）
```

**示例**：
- 用户 A 属于技术部
- 应用 X 的 `department_id` = 产品部（管理权归产品部）
- 应用 X 发布到了技术部（`app_published_departments` 有记录）
- 结果：用户 A 可以在探索中看到并使用应用 X，但不能编辑/管理应用 X

---

## 探索模块查询流程

### 探索列表组成

探索模块展示的应用 = **发布到用户所属部门的应用** + **用户已安装且仍有权限的应用**

```
+------------------------------------------------------------------+
|                    探索列表查询流程                                 |
+------------------------------------------------------------------+
|                                                                    |
|  用户访问探索页面                                                   |
|       |                                                            |
|       v                                                            |
|  获取用户 department_id                                            |
|       |                                                            |
|       |--> 查询 app_published_departments                          |
|       |    WHERE department_id = 用户部门ID                         |
|       |    --> 得到"已发布应用列表"                                 |
|       |                                                            |
|       |--> 查询 installed_apps                                     |
|       |    WHERE tenant_id = 当前租户 AND 用户已安装                 |
|       |    AND 应用仍发布到用户部门（JOIN 过滤）                     |
|       |    --> 得到"已安装应用列表"（收藏/置顶）                    |
|       |                                                            |
|       v                                                            |
|  合并去重（以 app_id 去重）                                         |
|       |                                                            |
|       v                                                            |
|  过滤条件：                                                         |
|  - app.status = 'normal'                                           |
|  - app.enable_site = true（站点已启用）                             |
|       |                                                            |
|       v                                                            |
|  排序：已安装/置顶优先 --> 发布时间倒序                             |
|       |                                                            |
|       v                                                            |
|  返回探索列表                                                       |
|                                                                    |
+------------------------------------------------------------------+
```

### 角色差异

| 角色 | 探索列表范围 |
|------|-------------|
| 租户管理员（owner/admin） | 所有已发布的应用（不限部门）+ 已安装 |
| 部门管理员 | 发布到本部门及子部门的应用 + 已安装 |
| 普通成员（editor/normal/dataset_operator） | 发布到本部门的应用 + 已安装 |

### 已安装记录的静默过滤策略

- 取消发布后，不删除 `installed_apps` 记录
- 查询探索列表时，已安装应用必须 JOIN `app_published_departments` 验证仍有权限
- 用户感知：应用从列表中消失
- 重新发布后：用户的置顶/收藏状态自动恢复

**查询 SQL 示例**：

```sql
-- 普通成员：探索列表
SELECT DISTINCT a.*
FROM apps a
WHERE a.tenant_id = :tenant_id
  AND a.status = 'normal'
  AND a.enable_site = true
  AND (
    -- 条件1：发布到用户部门
    EXISTS (
      SELECT 1 FROM app_published_departments apd
      WHERE apd.app_id = a.id
        AND apd.department_id = :user_department_id
    )
    OR
    -- 条件2：已安装且仍有发布权限
    EXISTS (
      SELECT 1 FROM installed_apps ia
      WHERE ia.app_id = a.id
        AND ia.tenant_id = :tenant_id
        AND EXISTS (
          SELECT 1 FROM app_published_departments apd2
          WHERE apd2.app_id = a.id
            AND apd2.department_id = :user_department_id
        )
    )
  )
ORDER BY a.created_at DESC;
```

```sql
-- 租户管理员：探索列表（所有已发布应用）
SELECT DISTINCT a.*
FROM apps a
WHERE a.tenant_id = :tenant_id
  AND a.status = 'normal'
  AND a.enable_site = true
  AND EXISTS (
    SELECT 1 FROM app_published_departments apd
    WHERE apd.app_id = a.id
  )
ORDER BY a.created_at DESC;
```

```sql
-- 部门管理员：探索列表（本部门及子部门）
SELECT DISTINCT a.*
FROM apps a
WHERE a.tenant_id = :tenant_id
  AND a.status = 'normal'
  AND a.enable_site = true
  AND EXISTS (
    SELECT 1 FROM app_published_departments apd
    WHERE apd.app_id = a.id
      AND apd.department_id IN (
        SELECT id FROM departments
        WHERE path LIKE :department_path_pattern  -- 例如 '/tenant1/abc123%'
      )
  )
ORDER BY a.created_at DESC;
```

---

## 应用发布管理流程

### 发布管理入口

在应用设置页面新增"发布管理"入口：

```
应用设置
|-- 基本信息
|-- 模型配置
|-- 访问 API（现有）
|-- 站点配置（现有 enable_site）
+-- 发布管理（新增）
    |-- 发布状态：已发布 / 未发布
    |-- 已发布部门列表
    +-- [编辑发布部门] 按钮
```

### 发布操作流程

```
+------------------------------------------------------------------+
|                    应用发布操作流程                                 |
+------------------------------------------------------------------+
|                                                                    |
|  用户进入应用设置 --> 发布管理                                      |
|       |                                                            |
|       v                                                            |
|  检查权限（owner/admin/editor？）                                   |
|       |                                                            |
|       |-- N --> 显示只读发布状态，无编辑按钮                        |
|       |                                                            |
|       |-- Y                                                        |
|       v                                                            |
|  显示部门多选对话框                                                 |
|  +---------------------------------------------+                   |
|  | [x] 技术部                                  |                   |
|  | [x] 技术部 > 前端组                         |                   |
|  | [ ] 技术部 > 后端组                         |                   |
|  | [x] 产品部                                  |                   |
|  | [ ] 运营部                                  |                   |
|  +---------------------------------------------+                   |
|       |                                                            |
|       v                                                            |
|  点击「保存」                                                       |
|       |                                                            |
|       v                                                            |
|  后端处理：                                                         |
|  1. 对比新旧部门列表                                               |
|  2. 新增的 --> INSERT app_published_departments                    |
|  3. 移除的 --> DELETE app_published_departments                    |
|  4. 记录审计日志                                                   |
|       |                                                            |
|       v                                                            |
|  返回成功                                                           |
|                                                                    |
+------------------------------------------------------------------+
```

### 前置条件与规则

1. 应用必须 `enable_site = true` 才允许配置发布部门（站点未启用时，发布无意义）
2. 如果 `enable_site` 被关闭，发布记录**保留不删**（重新启用后恢复）
3. 部门多选列表展示当前租户的所有部门（树形结构带复选框）
4. 允许不选择任何部门（等同于未发布，探索列表不显示）

### 按钮权限控制

| 按钮 | 租户管理员 | 部门管理员 | editor | normal/dataset_operator |
|------|:---:|:---:|:---:|:---:|
| 查看发布状态 | Y | Y | Y | Y（只读） |
| 编辑发布部门 | Y | Y | Y | N（隐藏） |

---

## 聊天 URL 鉴权流程

### 改造前（现有机制）

```
用户访问 /chat/{code} --> 前端加载 --> 调用 /api/passport 获取匿名 token --> 直接使用
```

无需登录，创建匿名 EndUser。

### 改造后流程

```
+------------------------------------------------------------------+
|                  聊天 URL 鉴权流程                                 |
+------------------------------------------------------------------+
|                                                                    |
|  用户访问 /chat/{code}                                             |
|       |                                                            |
|       v                                                            |
|  前端检查本地是否有有效的控制台 session/token                        |
|       |                                                            |
|       |-- 无有效登录态                                              |
|       |       |                                                    |
|       |       v                                                    |
|       |   重定向到控制台登录页                                      |
|       |   /signin?redirect=/chat/{code}                            |
|       |       |                                                    |
|       |       v                                                    |
|       |   用户输入邮箱/密码登录                                     |
|       |       |                                                    |
|       |       v                                                    |
|       |   登录成功，携带 redirect 跳回 /chat/{code}                 |
|       |                                                            |
|       |-- 有有效登录态                                              |
|       |                                                            |
|       v                                                            |
|  前端调用后端验证接口                                               |
|  POST /api/chat-access/verify                                      |
|  { "app_code": "{code}" }                                          |
|       |                                                            |
|       v                                                            |
|  后端校验：                                                         |
|  1. 通过 code 找到 Site --> App                                    |
|  2. 检查 app.enable_site = true                                    |
|  3. 检查 app.status = 'normal'                                     |
|  4. 获取当前登录用户的 department_id                                |
|  5. 检查权限：                                                      |
|     - 租户管理员 --> 允许                                          |
|     - 部门管理员 --> 检查应用是否发布到本部门或子部门                |
|     - 普通成员 --> 检查应用是否发布到本部门                         |
|       |                                                            |
|       |-- 权限通过                                                  |
|       |       |                                                    |
|       |       v                                                    |
|       |   返回 { "access": true, "app_info": {...} }               |
|       |   前端正常加载聊天界面                                      |
|       |                                                            |
|       |-- 权限拒绝                                                  |
|       |       |                                                    |
|       |       v                                                    |
|       |   返回 403 { "code": "access_denied",                      |
|       |     "message": "您无权访问此应用" }                         |
|       |   前端显示"无权限"提示页                                    |
|       |                                                            |
|       v                                                            |
|  结束                                                              |
|                                                                    |
+------------------------------------------------------------------+
```

### 关键设计点

**1. 登录态复用**

- 聊天页面和控制台共用同一套 session/JWT 认证
- 如果用户已在控制台登录，访问聊天 URL 无需再次登录
- 登录页支持 `redirect` 参数，登录后自动跳回

**2. 不再创建匿名 EndUser**

- 改造后，聊天使用当前登录的 Account 身份
- `conversations` 和 `messages` 表中的 `from_account_id` 记录真实用户
- 不再需要 `end_users` 表的匿名记录

**3. 无权限提示页**

用户登录成功但部门无权限时，显示友好提示：

```
+-------------------------------------------+
|           [LOCK] 无访问权限                |
|                                            |
|   您所在的部门未被授权使用此应用。         |
|   请联系管理员获取访问权限。               |
|                                            |
|         [返回控制台]                       |
+-------------------------------------------+
```

**4. 兼容 enable_site = false**

- 如果应用 `enable_site = false`，聊天 URL 直接返回 404（与现有行为一致）
- 鉴权逻辑只在 `enable_site = true` 时触发

---

## 权限矩阵

### 完整权限矩阵

| 操作 | 租户管理员 (owner/admin) | 部门管理员 | editor（非部门管理员） | normal | dataset_operator |
|------|:---:|:---:|:---:|:---:|:---:|
| 管理应用发布部门 | Y（所有应用） | Y（有编辑权限的应用） | Y（有编辑权限的应用） | N | N |
| 探索列表可见范围 | 所有已发布应用 | 本部门及子部门 | 本部门 | 本部门 | 本部门 |
| 使用已发布应用（聊天） | Y | Y | Y | Y | Y |
| 通过 URL 访问聊天 | Y（登录后） | Y（登录后，部门匹配） | Y（登录后，部门匹配） | Y（登录后，部门匹配） | Y（登录后，部门匹配） |
| 编辑/管理应用 | Y（现有逻辑） | Y（现有逻辑） | Y（现有逻辑） | N | N |
| 安装/收藏应用 | Y | Y | Y | Y | Y |

### 权限分离原则

```
+------------------------------------------------------------------+
|  管理权（现有逻辑不变）           使用权（新增）                    |
+------------------------------------------------------------------+
|                                                                    |
|  决定因素：                         决定因素：                      |
|  - apps.department_id              - app_published_departments     |
|  - 用户角色（role）                - 用户所属部门                   |
|  - 是否为部门管理员                - 是否为租户管理员               |
|                                                                    |
|  可执行操作：                       可执行操作：                    |
|  - 编辑应用配置                    - 在探索中查看                   |
|  - 管理工作流                      - 使用聊天功能                   |
|  - 管理发布部门                    - 通过 URL 访问                  |
|  - 删除应用                        - 安装/收藏                      |
|                                                                    |
+------------------------------------------------------------------+
```

---

## 边界规则

| 场景 | 处理方式 |
|------|---------|
| 应用未发布到任何部门 | 探索列表不显示，URL 访问返回 403（即使 enable_site=true） |
| 应用 enable_site=false | URL 返回 404，探索不显示（无论是否配置了发布部门） |
| 用户被移动到新部门 | 立即生效：原部门发布的应用不可见，新部门发布的可见 |
| 应用发布后又被取消发布 | 该部门用户探索列表不再显示，URL 访问返回 403 |
| 租户管理员访问任何聊天 URL | 始终允许（不受部门限制） |
| 应用创建者访问未发布到本部门的应用 | 管理界面可进入（管理权），聊天 URL 需发布到其部门才能使用 |
| 部门管理员的探索范围 | 本部门及子部门发布的应用均可见 |
| 取消发布后重新发布 | 用户已安装/置顶状态自动恢复（静默过滤策略） |

---

## API 接口设计

### 发布管理接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/console/api/apps/{app_id}/publish-departments` | 有编辑权限 | 获取应用已发布的部门列表 |
| PUT | `/console/api/apps/{app_id}/publish-departments` | 有编辑权限 | 更新发布部门（全量替换） |

#### GET 响应示例

```json
{
  "published_departments": [
    {"id": "dept-uuid-1", "name": "技术部", "path": "/tenant1/dept1"},
    {"id": "dept-uuid-2", "name": "前端组", "path": "/tenant1/dept1/dept2"}
  ],
  "published_at": "2026-07-26T10:00:00Z",
  "published_by": "user-uuid"
}
```

#### PUT 请求体

```json
{
  "department_ids": ["dept-uuid-1", "dept-uuid-2", "dept-uuid-3"]
}
```

#### PUT 响应示例

```json
{
  "result": "success",
  "published_departments": [
    {"id": "dept-uuid-1", "name": "技术部"},
    {"id": "dept-uuid-2", "name": "前端组"},
    {"id": "dept-uuid-3", "name": "产品部"}
  ]
}
```

### 聊天访问验证接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/chat-access/verify` | 已登录用户 | 验证当前用户是否有权访问指定聊天应用 |

#### POST 请求体

```json
{
  "app_code": "mPcVRKyrbEVBDVvX"
}
```

#### POST 响应（成功）

```json
{
  "access": true,
  "app_info": {
    "app_id": "app-uuid",
    "name": "智能客服助手",
    "icon_type": "emoji",
    "icon": "robot",
    "icon_background": "#FFEAD5",
    "description": "基于知识库的智能客服",
    "mode": "advanced-chat"
  }
}
```

#### POST 响应（无权限）

```json
{
  "access": false,
  "code": "access_denied",
  "message": "您所在的部门未被授权使用此应用"
}
```

#### POST 响应（应用不存在/未启用）

```json
{
  "access": false,
  "code": "not_found",
  "message": "应用不存在或未启用"
}
```

### 探索列表接口（改造）

现有接口 `GET /console/api/installed-apps` 改造为带部门过滤：

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/console/api/explore/department-apps` | 已登录用户 | 获取发布到用户部门的可用应用列表 |

#### GET 响应示例

```json
{
  "apps": [
    {
      "app_id": "app-uuid-1",
      "name": "智能客服助手",
      "description": "基于知识库的智能客服",
      "mode": "advanced-chat",
      "icon_type": "emoji",
      "icon": "robot",
      "icon_background": "#FFEAD5",
      "published_at": "2026-07-26T10:00:00Z",
      "is_installed": true,
      "is_pinned": false
    }
  ],
  "total": 5
}
```

---

## 与现有系统的关系

```
+------------------------------------------------------------------+
|  现有机制（不变）                 新增机制                          |
+------------------------------------------------------------------+
|                                                                    |
|  apps.department_id               app_published_departments        |
|  --> 决定"谁管理/编辑"            --> 决定"谁使用"                 |
|                                                                    |
|  apps.enable_site                 聊天 URL 鉴权                    |
|  --> 控制站点开关                 --> 强制登录 + 部门校验           |
|                                                                    |
|  installed_apps                   探索列表部门过滤                  |
|  --> 收藏/置顶                   --> 按发布部门过滤可见性           |
|                                                                    |
|  权限中间件                       发布管理 API                      |
|  --> 管理操作的权限检查           --> 配置应用可见部门               |
|                                                                    |
+------------------------------------------------------------------+
```

### 向后兼容

| 场景 | 处理方式 |
|------|---------|
| 现有已启用站点的应用 | 迁移时不自动配置发布部门，需管理员手动发布 |
| 现有匿名访问的聊天 URL | 改造后强制登录，匿名用户需先注册/登录 |
| 现有 installed_apps 数据 | 保留，但查询时增加发布权限 JOIN 过滤 |
| 现有 API 接口 | 新增接口，不修改现有接口路径 |

### 数据迁移建议

```sql
-- 可选：将现有已启用站点的应用自动发布到其所属部门
INSERT INTO app_published_departments (id, app_id, department_id, published_by, created_at)
SELECT
  uuid_generate_v4(),
  a.id,
  a.department_id,
  a.created_by,
  NOW()
FROM apps a
WHERE a.enable_site = true
  AND a.department_id IS NOT NULL
  AND a.status = 'normal'
ON CONFLICT (app_id, department_id) DO NOTHING;
```

---

## 审计日志

以下操作需记录审计日志（复用现有 `operation_logs` 表）：

| 操作 | 日志类型 | 记录内容 |
|------|---------|---------|
| 发布应用到部门 | `publish_app_to_departments` | 应用 ID、目标部门 ID 列表、操作者 |
| 取消应用发布 | `unpublish_app_from_departments` | 应用 ID、移除的部门 ID 列表、操作者 |
| 聊天 URL 访问被拒绝 | `chat_access_denied`（可选） | 应用 ID、用户 ID、用户部门 ID |

---

**文档结束**
