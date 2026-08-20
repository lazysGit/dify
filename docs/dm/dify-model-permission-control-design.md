# 模型调用权限控制设计文档

**生成日期**: 2026-07-31
**基于**: Dify Community Edition + 部门管理系统
**依赖**: dify-database-design-department.md, dify-department-system-architecture.md

---

## 目录

1. [需求概述](#1-需求概述)
2. [设计决策](#2-设计决策)
3. [数据库设计](#3-数据库设计)
4. [架构与流程设计](#4-架构与流程设计)
5. [API 接口设计](#5-api-接口设计)
6. [前端页面设计](#6-前端页面设计)
7. [权限矩阵](#7-权限矩阵)
8. [边界规则与错误处理](#8-边界规则与错误处理)
9. [数据迁移与向后兼容](#9-数据迁移与向后兼容)
10. [审计日志](#10-审计日志)
11. [测试策略](#11-测试策略)

---

## 1. 需求概述

当前系统只有租户级的模型配置（`providers` + `provider_models` 表），所有用户共享同一套模型和 API 密钥。需要新增：

1. **管理员级模型白名单**：在成员管理页面，系统管理员可以为每个用户设置允许使用的模型白名单（粒度：提供商 + 模型 + 模型类型）
2. **用户级个人模型设置**：每个用户新增一个个人模型设置页面，可以添加个人 API 密钥（覆盖系统密钥），个人模型默认使用系统级配置，用户可自行修改

---

## 2. 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 权限模型 | 白名单 + 个人密钥 | 白名单控制可见范围，个人密钥支持成本独立核算 |
| 白名单粒度 | 提供商 + 模型 + 模型类型 | 最大灵活性，精确控制每种用途 |
| 默认行为 | 无白名单 = 全部允许 | 向后兼容，现有用户无感知 |
| 密钥优先级 | 个人密钥覆盖系统密钥 | 简单可预测，个人密钥存在时系统密钥完全忽略 |
| 执行点 | 选择时过滤（非运行时拦截） | 防止误配置，无需在每次 LLM 调用时检查 |
| 个人密钥权限 | 所有角色可添加 | 最大灵活性 |
| 数据存储方案 | 独立新表 | 清晰分离，遵循 DDD 分层 |

---

## 3. 数据库设计

### 新增表：account_model_whitelist

**表名**: `account_model_whitelist`
**用途**: 存储用户的模型白名单。无记录 = 不限制（所有系统模型可用）；有记录 = 仅允许记录中的模型。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 记录 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `account_id` | UUID | NOT NULL, INDEX | 用户 ID |
| `provider_name` | VARCHAR(255) | NOT NULL | 提供商名称（如 `openai`） |
| `model_name` | VARCHAR(255) | NOT NULL | 模型名称（如 `gpt-4`） |
| `model_type` | VARCHAR(255) | NOT NULL | 模型类型（`llm`、`text-embedding`、`rerank`、`speech2text`、`tts`） |
| `created_by` | UUID | NOT NULL | 创建者（管理员 ID） |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

**唯一约束**:
- `unique_account_model`: (account_id, provider_name, model_name, model_type) — 同一用户同一模型不可重复

**索引**:
- `account_model_whitelist_account_idx`: account_id（查用户白名单）
- `account_model_whitelist_tenant_idx`: tenant_id（管理查询）

**隐式限制规则**:
- 如果 `account_model_whitelist` 表中该用户**无任何记录** → 用户可使用所有系统配置的模型（向后兼容）
- 如果该用户**有记录** → 用户只能使用记录中列出的模型

### 新增表：account_provider_credentials

**表名**: `account_provider_credentials`
**用途**: 存储用户的个人 API 密钥。每个用户每个提供商最多一条记录。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 记录 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `account_id` | UUID | NOT NULL, INDEX | 用户 ID |
| `provider_name` | VARCHAR(255) | NOT NULL | 提供商名称 |
| `encrypted_config` | TEXT | NOT NULL | 加密的凭证 JSON（API key, base_url 等） |
| `is_valid` | BOOLEAN | NOT NULL, DEFAULT false | 密钥是否验证通过 |
| `last_used` | TIMESTAMP | NULLABLE | 最后使用时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**唯一约束**:
- `unique_account_provider`: (account_id, provider_name) — 每用户每提供商一条凭证

**索引**:
- `account_provider_cred_account_idx`: (account_id, provider_name)（查用户密钥）

**加密说明**:
- `encrypted_config` 使用租户的 `encrypt_public_key` 加密，与现有 `providers.encrypted_config` 使用相同加密机制
- 存储格式与 `providers` 表的 `encrypted_config` 一致

### DDL

```sql
CREATE TABLE account_model_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    account_id UUID NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_account_model UNIQUE (account_id, provider_name, model_name, model_type)
);

CREATE INDEX account_model_whitelist_account_idx ON account_model_whitelist (account_id);
CREATE INDEX account_model_whitelist_tenant_idx ON account_model_whitelist (tenant_id);

CREATE TABLE account_provider_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    account_id UUID NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    encrypted_config TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    last_used TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_account_provider UNIQUE (account_id, provider_name)
);

CREATE INDEX account_provider_cred_account_idx ON account_provider_credentials (account_id, provider_name);
CREATE INDEX account_provider_cred_tenant_idx ON account_provider_credentials (tenant_id);
```

### 现有表关系

| 表 | 关联 | 说明 |
|----|------|------|
| `providers` | 系统级密钥来源 | 个人密钥覆盖时不查此表 |
| `provider_models` | 系统级模型列表 | 白名单过滤的基础数据源 |

---

## 4. 架构与流程设计

### 4.1 架构层次

```
┌──────────────────────────────────────────────────────────────────┐
│  前端层                                                           │
│  - 成员管理页面（管理员设置白名单）                                 │
│  - 个人模型设置页面（用户管理个人密钥）                             │
│  - 应用/工作流模型选择器（按白名单过滤）                            │
└────────────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Controller 层                                                    │
│  - MemberModelWhitelistApi (GET/PUT)                             │
│  - AccountModelSettingsApi (GET)                                 │
│  - AccountProviderCredentialApi (POST/DELETE)                    │
└────────────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Service 层                                                       │
│  ModelPermissionService                                           │
│  - get_whitelist(account_id) → list[WhitelistEntry]              │
│  - set_whitelist(account_id, models[])                           │
│  - get_filtered_models(account_id) → filtered model list         │
│  - has_personal_credential(account_id, provider_name) → bool     │
│                                                                   │
│  PersonalCredentialService                                        │
│  - add_credential(account_id, provider_name, config)             │
│  - update_credential(account_id, provider_name, config)          │
│  - delete_credential(account_id, provider_name)                  │
│  - validate_credential(account_id, provider_name) → bool         │
│  - get_credential(account_id, provider_name) → encrypted_config  │
└────────────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Repository 层                                                    │
│  AccountModelWhitelistRepository                                  │
│  - find_by_account(account_id) → list[Model]                     │
│  - replace_for_account(account_id, models[]) (DELETE + INSERT)   │
│  - exists_for_account(account_id) → bool                         │
│                                                                   │
│  AccountProviderCredentialRepository                              │
│  - find_by_account_provider(account_id, provider) → Credential   │
│  - save(credential)                                              │
│  - delete(account_id, provider)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 白名单解析流程（模型列表过滤）

当用户在任何地方打开模型选择器时（应用配置、工作流节点、知识库 embedding 设置等）：

```
用户请求可用模型列表
       │
       ▼
ModelPermissionService.get_filtered_models(account_id, user)
       │
       ▼
用户是 owner/admin?
       │
       ├── 是 → 直接返回所有系统配置的模型（管理员不受白名单限制）
       │
       └── 否 → 查询 account_model_whitelist WHERE account_id = ?
                │
                ├── 无记录 → 返回所有系统配置的模型（向后兼容）
                │            （从 provider_models + providers 查询）
                │
                └── 有记录 → 获取系统所有模型，过滤为白名单中的记录
                             返回过滤后的列表
```

**Service 层伪代码**:

```python
def get_filtered_models(account_id: str, tenant_id: str, user: Account) -> list[ModelInfo]:
    """获取用户可用的模型列表（经过白名单过滤）"""

    # 获取系统所有配置的模型
    all_models = ProviderModelService.get_all_models(tenant_id)

    # owner/admin 不受白名单限制
    if user.is_admin_or_owner:
        return all_models

    # 查询用户白名单
    whitelist_entries = AccountModelWhitelistRepository.find_by_account(account_id)

    if not whitelist_entries:
        # 无白名单 = 不限制
        return all_models

    # 有白名单 = 过滤
    whitelist_set = {
        (e.provider_name, e.model_name, e.model_type)
        for e in whitelist_entries
    }

    return [
        m for m in all_models
        if (m.provider, m.model, m.model_type) in whitelist_set
    ]
```

### 4.3 凭证解析流程（密钥覆盖）

当用户的实际调用 LLM 时，凭证解析逻辑：

```
应用请求模型凭证 (account_id, provider_name)
       │
       ▼
查询 account_provider_credentials
WHERE account_id = ? AND provider_name = ?
       │
       ├── 记录存在且 is_valid = true
       │     → 使用个人密钥（解密 encrypted_config）
       │       系统密钥完全忽略
       │
       └── 无记录（或 is_valid = false）
             → 使用系统级 providers 表的密钥
```

**凭证解析伪代码**:

```python
def resolve_credentials(account_id: str, provider_name: str, tenant_id: str) -> dict:
    """解析模型凭证：个人密钥优先，无则用系统密钥"""

    # 先查个人密钥
    personal_cred = AccountProviderCredentialRepository.find_by_account_provider(
        account_id, provider_name
    )

    if personal_cred and personal_cred.is_valid:
        return decrypt_config(personal_cred.encrypted_config)

    # 回退到系统密钥
    system_provider = ProviderRepository.find_by_tenant_and_name(
        tenant_id, provider_name
    )

    if system_provider and system_provider.encrypted_config:
        return decrypt_config(system_provider.encrypted_config)

    raise CredentialsNotFoundError(f"No credentials for provider {provider_name}")
```

**集成点**: 现有的模型凭证获取逻辑（`model_provider_factory` 或 `provider_service`）需要修改，在获取凭证时传入 `account_id`，按上述逻辑解析。

### 4.4 管理员设置白名单流程

```
管理员在成员管理页面 → 点击某成员的"模型权限"
       │
       ▼
后端返回：系统所有配置模型 + 该用户当前白名单
GET /workspaces/current/members/{account_id}/model-whitelist
       │
       ▼
前端展示模型复选框树（按提供商分组）
       │
       ├── 无白名单 → 全部预选中
       └── 有白名单 → 仅白名单中的模型选中
       │
       ▼
管理员勾选/取消模型 → 保存
PUT /workspaces/current/members/{account_id}/model-whitelist
       │
       ▼
后端处理：
  1. DELETE FROM account_model_whitelist WHERE account_id = ?
  2. INSERT 新的白名单记录
  3. 如果全部模型都选中（= 无限制）→ 只执行 DELETE，不 INSERT
  4. 记录审计日志
```

### 4.5 用户管理个人密钥流程

```
用户打开个人模型设置页面
       │
       ▼
后端返回：可用模型列表（经白名单过滤）+ 个人密钥列表
GET /account/model-settings
       │
       ▼
用户点击"添加密钥" → 填写提供商凭证（API key 等）
       │
       ▼
后端加密存储 → 验证密钥有效性
POST /account/provider-credentials
       │
       ▼
验证通过 → is_valid = true → 返回成功
验证失败 → is_valid = false → 返回错误信息
       │
       ▼
此后该用户的所有该提供商模型调用使用个人密钥
```

---

## 5. API 接口设计

### 5.1 模型白名单管理（管理员）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/console/api/workspaces/current/members/{account_id}/model-whitelist` | owner/admin | 获取用户白名单 + 系统所有模型 |
| PUT | `/console/api/workspaces/current/members/{account_id}/model-whitelist` | owner/admin | 替换白名单（全量替换） |

#### GET 响应示例

```json
{
  "is_restricted": true,
  "whitelist": [
    {"provider": "openai", "model": "gpt-4", "model_type": "llm"},
    {"provider": "openai", "model": "gpt-4o", "model_type": "llm"},
    {"provider": "openai", "model": "text-embedding-3-small", "model_type": "text-embedding"}
  ],
  "all_system_models": [
    {"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "GPT-4"},
    {"provider": "openai", "model": "gpt-4o", "model_type": "llm", "label": "GPT-4o"},
    {"provider": "openai", "model": "gpt-3.5-turbo", "model_type": "llm", "label": "GPT-3.5 Turbo"},
    {"provider": "openai", "model": "text-embedding-3-small", "model_type": "text-embedding", "label": "Text Embedding 3 Small"},
    {"provider": "anthropic", "model": "claude-3-opus", "model_type": "llm", "label": "Claude 3 Opus"}
  ]
}
```

`is_restricted = false` 表示该用户无白名单记录（所有模型可用）。`is_restricted = true` 表示有白名单记录。

#### PUT 请求体

```json
{
  "models": [
    {"provider": "openai", "model": "gpt-4", "model_type": "llm"},
    {"provider": "openai", "model": "gpt-4o", "model_type": "llm"},
    {"provider": "openai", "model": "text-embedding-3-small", "model_type": "text-embedding"}
  ]
}
```

**规则**:
- 空数组 `[]` = 删除所有白名单记录 = 不限制（全部可用）
- 非空数组 = 删除旧记录 + 插入新记录 = 限制为列出的模型
- 请求体中的模型必须在 `all_system_models` 范围内，否则返回 400

#### PUT 响应示例

```json
{
  "result": "success",
  "is_restricted": true,
  "whitelist_count": 3
}
```

### 5.2 个人模型设置（用户）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/console/api/account/model-settings` | 已登录用户 | 获取可用模型 + 个人密钥列表 |
| POST | `/console/api/account/provider-credentials` | 已登录用户 | 添加/更新个人密钥 |
| DELETE | `/console/api/account/provider-credentials/{provider_name}` | 已登录用户 | 删除个人密钥 |
| POST | `/console/api/account/provider-credentials/{provider_name}/validate` | 已登录用户 | 验证密钥有效性 |

#### GET /account/model-settings 响应示例

```json
{
  "available_models": [
    {"provider": "openai", "model": "gpt-4", "model_type": "llm", "label": "GPT-4"},
    {"provider": "openai", "model": "gpt-4o", "model_type": "llm", "label": "GPT-4o"}
  ],
  "is_restricted": true,
  "personal_credentials": [
    {
      "provider_name": "openai",
      "is_valid": true,
      "last_used": "2026-07-30T10:00:00Z",
      "created_at": "2026-07-28T14:00:00Z"
    }
  ]
}
```

注意：`personal_credentials` 不返回实际的 API key（仅返回元信息）。

#### POST /account/provider-credentials 请求体

```json
{
  "provider_name": "openai",
  "credentials": {
    "api_key": "sk-xxxxxxxxxxxx",
    "base_url": "https://api.openai.com/v1"
  }
}
```

后端使用租户公钥加密 `credentials` 后存入 `encrypted_config`。

#### POST 响应示例（成功）

```json
{
  "result": "success",
  "provider_name": "openai",
  "is_valid": true
}
```

#### POST 响应示例（密钥无效）

```json
{
  "result": "success",
  "provider_name": "openai",
  "is_valid": false,
  "message": "API key 验证失败：Invalid API key"
}
```

注意：即使密钥无效也保存记录（`is_valid = false`），凭证解析时会跳过无效密钥。

### 5.3 现有接口修改

| 接口 | 修改内容 |
|------|---------|
| `GET /console/api/workspaces/current/model-providers` | 响应中的模型列表按当前用户白名单过滤 |
| 模型选择器相关接口 | 统一通过 `ModelPermissionService.get_filtered_models()` 过滤 |

---

## 6. 前端页面设计

### 6.1 成员管理 — 模型权限入口

在现有成员列表页面，每个成员行新增"模型权限"按钮（仅 owner/admin 可见）：

```
┌──────────────────────────────────────────────────────────────────┐
│  成员管理                                          [+ 创建成员]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 👤 张三                    zhangsan@example.com           │    │
│  │    部门: 技术部 > 前端组  |  角色: 编辑者                 │    │
│  │    [编辑] [移出] [模型权限]                               │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │ 👤 李四                    lisi@example.com               │    │
│  │    部门: 技术部 > 后端组  |  角色: 编辑者                 │    │
│  │    [编辑] [移出] [模型权限]                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 模型白名单对话框

点击"模型权限"后弹出：

```
┌──────────────────────────────────────────────────────────────────┐
│  模型权限 - 张三                                        [×]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ℹ️ 不勾选任何模型 = 用户可使用所有系统模型（默认）                  │
│     勾选后 = 用户只能使用勾选的模型                                 │
│                                                                    │
│  ── LLM ────────────────────────────────────────────────────     │
│  ▼ OpenAI                                                         │
│    ☑ gpt-4                    (LLM)                               │
│    ☑ gpt-4o                   (LLM)                               │
│    ☐ gpt-3.5-turbo            (LLM)                               │
│                                                                    │
│  ▼ Anthropic                                                      │
│    ☑ claude-3-opus            (LLM)                               │
│    ☑ claude-3-sonnet          (LLM)                               │
│                                                                    │
│  ── Text Embedding ────────────────────────────────────────      │
│  ▼ OpenAI                                                         │
│    ☑ text-embedding-3-small   (Text Embedding)                    │
│                                                                    │
│  [全选] [全不选]                                                   │
│                                                                    │
│                                          [取消]  [保存]            │
└──────────────────────────────────────────────────────────────────┘
```

**交互逻辑**:
- 首次打开时，如果用户无白名单记录（`is_restricted = false`），全部预选中
- 管理员取消勾选所有模型并保存 → DELETE 所有记录 → 用户回到"全部可用"
- 管理员勾选部分模型并保存 → 替换为新白名单

### 6.3 个人模型设置页面

**路径**: `/console/account/model-settings`（或集成在账户设置中）

```
┌──────────────────────────────────────────────────────────────────┐
│  个人模型设置                                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ── 可用模型（只读）─────────────────────────────────────────    │
│                                                                    │
│  状态: ✅ 可使用所有系统模型                                       │
│  （或：⚠️ 管理员已限制可用模型范围）                                │
│                                                                    │
│  LLM:                                                              │
│  • OpenAI: gpt-4, gpt-4o                                          │
│  • Anthropic: claude-3-opus, claude-3-sonnet                      │
│                                                                    │
│  Text Embedding:                                                   │
│  • OpenAI: text-embedding-3-small                                 │
│                                                                    │
│  ── 个人 API 密钥 ──────────────────────────────────────────     │
│  添加个人密钥后，对应提供商的模型调用将使用个人密钥（覆盖系统密钥） │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ OpenAI                                          [有效 ✓] │    │
│  │ 密钥: sk-****...1234                                      │    │
│  │ 最后使用: 2026-07-30 10:00                                │    │
│  │ [验证] [编辑] [删除]                                      │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │ + 添加密钥                                                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. 权限矩阵

| 操作 | owner/admin | department_admin | editor | normal | dataset_operator |
|------|:-----------:|:----------------:|:------:|:------:|:----------------:|
| 设置成员白名单 | Y（所有成员） | N | N | N | N |
| 查看成员白名单 | Y（所有成员） | N | N | N | N |
| 添加个人密钥 | Y | Y | Y | Y | Y |
| 删除个人密钥 | Y（自己的） | Y（自己的） | Y（自己的） | Y（自己的） | Y（自己的） |
| 验证个人密钥 | Y | Y | Y | Y | Y |
| 查看可用模型 | Y（全部） | Y（按白名单） | Y（按白名单） | Y（按白名单） | Y（按白名单） |

注意：owner/admin 的模型列表不受白名单限制（管理员始终可使用所有模型）。

---

## 8. 边界规则与错误处理

### 8.1 边界规则

| 场景 | 处理方式 |
|------|---------|
| 用户无白名单记录 | 所有系统配置的模型可用（向后兼容） |
| 管理员删除白名单所有记录 | DELETE 所有记录，用户回到"全部可用" |
| 管理员设置白名单后，系统新增了模型 | 新模型不在白名单中，用户不可见（白名单是精确匹配） |
| 用户已有应用配置了某模型，管理员从白名单移除了该模型 | 应用配置中的模型保留（不强制修改），但模型选择器不再显示该模型。应用仍可运行（选择时过滤，非运行时拦截） |
| 用户的个人密钥 is_valid = false | 凭证解析跳过个人密钥，回退到系统密钥 |
| 用户删除个人密钥 | 回退到系统密钥 |
| 用户同时有个人密钥和系统密钥 | 个人密钥优先（覆盖系统密钥） |
| owner/admin 的模型权限 | 管理员始终可使用所有模型，白名单不限制管理员 |
| 用户被移动到新部门 | 白名单不受部门影响，白名单是租户级用户级配置 |
| 系统未配置任何提供商/模型 | 所有用户模型列表为空（无论白名单） |

### 8.2 错误处理

| 错误场景 | HTTP 状态码 | 错误码 | 说明 |
|---------|:-----------:|--------|------|
| 非管理员尝试设置白名单 | 403 | `forbidden` | 只有 owner/admin 可操作 |
| 白名单包含系统未配置的模型 | 400 | `invalid_model` | 模型必须在系统配置范围内 |
| 个人密钥验证失败 | 200 | — | 保存但 `is_valid=false`，不返回错误 |
| 凭证解密失败 | 500 | `internal_error` | 记录日志，回退系统密钥 |

---

## 9. 数据迁移与向后兼容

### 9.1 数据迁移

```sql
-- 无需迁移现有数据
-- account_model_whitelist 和 account_provider_credentials 新建为空表
-- 现有用户无白名单记录 = 全部可用（向后兼容）
-- 现有用户无个人密钥 = 使用系统密钥（向后兼容）
```

### 9.2 向后兼容

| 场景 | 处理方式 |
|------|---------|
| 现有用户的模型列表 | 不受影响（无白名单 = 全部可用） |
| 现有用户的模型凭证 | 不受影响（无个人密钥 = 使用系统密钥） |
| 现有 API 接口 | 模型列表接口新增白名单过滤逻辑，无白名单时行为不变 |
| 新增 API 接口 | 全部为新增接口，不修改现有接口路径 |

### 9.3 回滚策略

```sql
-- 删除新增表
DROP TABLE IF EXISTS account_model_whitelist;
DROP TABLE IF EXISTS account_provider_credentials;

-- 现有系统逻辑不受影响（白名单过滤逻辑在 Service 层，
-- 如果表不存在则视为无白名单 = 全部可用）
```

---

## 10. 审计日志

| 操作 | 日志类型 | 记录内容 |
|------|---------|---------|
| 管理员设置白名单 | `set_model_whitelist` | 用户 ID、白名单模型列表、操作者 |
| 管理员删除白名单 | `remove_model_whitelist` | 用户 ID、操作者 |
| 用户添加个人密钥 | `add_personal_credential` | 用户 ID、提供商名称 |
| 用户删除个人密钥 | `remove_personal_credential` | 用户 ID、提供商名称 |
| 个人密钥验证失败 | `personal_credential_invalid` | 用户 ID、提供商名称、错误信息 |

---

## 11. 测试策略

### 11.1 单元测试

**ModelPermissionService 测试**:
- 无白名单时返回所有模型
- 有白名单时仅返回白名单中的模型
- 白名单包含系统未配置的模型时忽略（不报错）
- owner/admin 不受白名单限制

**PersonalCredentialService 测试**:
- 有个人密钥且有效时使用个人密钥
- 有个人密钥但无效时回退系统密钥
- 无个人密钥时使用系统密钥
- 删除个人密钥后回退系统密钥
- 密钥加密/解密正确性

**API 层测试**:
- 非管理员设置白名单返回 403
- 管理员设置白名单成功
- 白名单包含无效模型返回 400
- 用户添加/删除个人密钥成功
- 个人密钥验证流程

### 11.2 集成测试

- 端到端：管理员设置白名单 → 用户模型选择器仅显示白名单模型
- 端到端：用户添加个人密钥 → 用户应用调用使用个人密钥

### 11.3 向后兼容测试

- 升级后现有用户模型列表不变
- 升级后现有用户模型调用不变
- 删除新表后系统正常工作（回退到全部可用 + 系统密钥）

---

## 总结

本文档详细描述了模型调用权限控制功能的设计：

- `account_model_whitelist` 表：管理员级模型白名单（隐式限制规则）
- `account_provider_credentials` 表：用户级个人 API 密钥（覆盖系统密钥）
- ModelPermissionService + PersonalCredentialService 双 Service 架构
- 选择时过滤的白名单执行策略
- 个人密钥覆盖系统密钥的凭证解析策略

**核心设计决策**:
- 白名单采用隐式限制规则（无记录=不限制），确保向后兼容
- 个人密钥覆盖系统密钥（非降级回退），简单可预测

---

**文档结束**
