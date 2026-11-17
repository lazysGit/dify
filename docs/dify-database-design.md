# Dify 数据库设计文档（社区版）

**生成日期**: 2026-07-07  
**版本**: Dify Community Edition  
**数据库类型**: PostgreSQL  
**ORM 框架**: SQLAlchemy 2.0

---

## 目录

1. [数据库概览](#数据库概览)
2. [用户与权限系统](#用户与权限系统)
3. [应用系统](#应用系统)
4. [工作流系统](#工作流系统)
5. [知识库系统](#知识库系统)
6. [模型提供商系统](#模型提供商系统)
7. [工具系统](#工具系统)
8. [其他辅助表](#其他辅助表)
9. [表关系图](#表关系图)
10. [附录](#附录)

---

## 数据库概览

Dify 数据库采用多租户架构设计，核心实体包括：

- **租户（Tenant）**：工作空间，数据隔离的基本单位
- **用户（Account）**：系统用户，可属于多个租户
- **应用（App）**：AI 应用，归属于租户
- **工作流（Workflow）**：应用的工作流定义
- **知识库（Dataset）**：文档知识库
- **模型提供商（Provider）**：LLM 模型提供商配置

### 核心设计原则

1. **多租户隔离**: 所有业务表都包含 `tenant_id` 字段，实现数据隔离
2. **软删除**: 使用 `enabled` 字段实现软删除，而非物理删除
3. **审计字段**: 所有表包含 `created_at`、`updated_at`、`created_by`、`updated_by` 字段
4. **UUID 主键**: 使用 UUID 作为主键，支持分布式部署

---

## 用户与权限系统

### 1. accounts（用户账户表）

**表名**: `accounts`  
**用途**: 存储系统用户的基本信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 用户 ID |
| `name` | VARCHAR(255) | NOT NULL | 用户名称 |
| `email` | VARCHAR(255) | NOT NULL, INDEX | 邮箱地址（唯一索引） |
| `password` | VARCHAR(255) | NULLABLE | 密码（加密存储） |
| `password_salt` | VARCHAR(255) | NULLABLE | 密码盐值 |
| `avatar` | VARCHAR(255) | NULLABLE | 头像 URL |
| `interface_language` | VARCHAR(255) | NULLABLE | 界面语言偏好 |
| `interface_theme` | VARCHAR(255) | NULLABLE | 界面主题偏好 |
| `timezone` | VARCHAR(255) | NULLABLE | 时区设置 |
| `last_login_at` | TIMESTAMP | NULLABLE | 最后登录时间 |
| `last_login_ip` | VARCHAR(255) | NULLABLE | 最后登录 IP |
| `last_active_at` | TIMESTAMP | NOT NULL | 最后活跃时间（自动更新） |
| `status` | ENUM | NOT NULL, DEFAULT 'active' | 账户状态 |
| `initialized_at` | TIMESTAMP | NULLABLE | 初始化完成时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**状态枚举（AccountStatus）**：
- `pending`: 待激活
- `uninitialized`: 未初始化
- `active`: 活跃
- `banned`: 被封禁
- `closed`: 已关闭

**索引**:
- `account_email_idx`: email 字段索引

**说明**:
- 用户表是全局表，不直接包含 `tenant_id`
- 用户与租户的关系通过 `tenant_account_joins` 表维护
- 用户可以在多个租户中拥有不同的角色

---

### 2. tenants（租户/工作空间表）

**表名**: `tenants`  
**用途**: 存储租户（工作空间）信息，是多租户架构的核心

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 租户 ID |
| `name` | VARCHAR(255) | NOT NULL | 租户名称 |
| `encrypt_public_key` | TEXT | NULLABLE | 加密公钥 |
| `plan` | VARCHAR(255) | NOT NULL, DEFAULT 'basic' | 订阅计划 |
| `status` | ENUM | NOT NULL, DEFAULT 'normal' | 租户状态 |
| `custom_config` | TEXT | NULLABLE | 自定义配置（JSON） |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**状态枚举（TenantStatus）**：
- `normal`: 正常
- `archive`: 已归档

**说明**:
- 租户是数据隔离的基本单位
- 所有业务数据（应用、知识库等）都归属于某个租户
- `plan` 字段用于区分免费版/付费版功能

---

### 3. tenant_account_joins（租户-用户关联表）

**表名**: `tenant_account_joins`  
**用途**: 维护用户与租户的多对多关系，**包含用户在租户中的角色**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 关联 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `account_id` | UUID | NOT NULL, INDEX | 用户 ID |
| `current` | BOOLEAN | NOT NULL, DEFAULT false | 是否为当前活跃租户 |
| `role` | ENUM | NOT NULL, DEFAULT 'normal' | **用户在租户中的角色** |
| `invited_by` | UUID | NULLABLE | 邀请人 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**角色枚举（TenantAccountRole）**：
- `owner`: 所有者（最高权限）
- `admin`: 管理员
- `editor`: 编辑者
- `normal`: 普通成员
- `dataset_operator`: 知识库操作员

**权限说明**:
- `owner` 和 `admin`: 特权角色，可以管理租户设置和成员
- `editor`: 可以创建和编辑应用
- `normal`: 只能使用应用，不能创建
- `dataset_operator`: 只能操作知识库

**唯一约束**:
- `unique_tenant_account_join`: (tenant_id, account_id) 组合唯一

**索引**:
- `tenant_account_join_account_id_idx`: account_id 索引
- `tenant_account_join_tenant_id_idx`: tenant_id 索引

---

### 4. account_integrates（用户集成/第三方登录表）

**表名**: `account_integrates`  
**用途**：存储用户的第三方登录集成信息（OAuth）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 集成 ID |
| `account_id` | UUID | NOT NULL | 用户 ID |
| `provider` | VARCHAR(16) | NOT NULL | 第三方提供商（如 GitHub、Google） |
| `open_id` | VARCHAR(255) | NOT NULL | 第三方平台的用户 ID |
| `encrypted_token` | VARCHAR(255) | NOT NULL | 加密的访问令牌 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**唯一约束**:
- `unique_account_provider`: (account_id, provider) 组合唯一
- `unique_provider_open_id`: (provider, open_id) 组合唯一

**说明**:
- 支持一个用户绑定多个第三方平台
- 同一第三方平台的同一 open_id 只能绑定一个账户

---

### 5. invitation_codes（邀请码表）

**表名**: `invitation_codes`  
**用途**: 管理系统邀请码，用于控制用户注册

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 邀请码 ID |
| `batch` | VARCHAR(255) | NOT NULL, INDEX | 批次号 |
| `code` | VARCHAR(32) | NOT NULL, INDEX | 邀请码 |
| `status` | ENUM | NOT NULL, DEFAULT 'unused' | 使用状态 |
| `used_at` | TIMESTAMP | NULLABLE | 使用时间 |
| `used_by_tenant_id` | UUID | NULLABLE | 使用此邀请码的租户 ID |
| `used_by_account_id` | UUID | NULLABLE | 使用此邀请码的用户 ID |
| `deprecated_at` | TIMESTAMP | NULLABLE | 废弃时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

**状态枚举（InvitationCodeStatus）**：
- `unused`: 未使用
- `used`: 已使用

**索引**:
- `invitation_codes_batch_idx`: batch 字段索引
- `invitation_codes_code_idx`: (code, status) 组合索引

---

### 6. account_plugin_permissions（插件权限表）

**表名**: `account_plugin_permissions`  
**用途**: 控制租户内插件的安装和调试权限

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 权限 ID |
| `tenant_id` | UUID | NOT NULL, UNIQUE | 租户 ID |
| `install_permission` | ENUM | NOT NULL, DEFAULT 'everyone' | 插件安装权限 |
| `debug_permission` | ENUM | NOT NULL, DEFAULT 'noone' | 插件调试权限 |

**权限枚举**:
- `everyone`: 所有人
- `admins`: 仅管理员
- `noone`: 无人（禁用）

**说明**:
- 每个租户一条记录，控制该租户的插件权限策略

---

### 7. tenant_plugin_auto_upgrade_strategies（插件自动升级策略表）

**表名**: `tenant_plugin_auto_upgrade_strategies`  
**用途**: 配置租户的插件自动升级策略

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 策略 ID |
| `tenant_id` | UUID | NOT NULL, UNIQUE | 租户 ID |
| `strategy_setting` | ENUM | NOT NULL, DEFAULT 'fix_only' | 策略设置 |
| `upgrade_mode` | ENUM | NOT NULL, DEFAULT 'exclude' | 升级模式 |
| `exclude_plugins` | JSON | NOT NULL, DEFAULT [] | 排除的插件列表 |
| `include_plugins` | JSON | NOT NULL, DEFAULT [] | 包含的插件列表 |
| `upgrade_time_of_day` | INTEGER | NOT NULL, DEFAULT 0 | 升级时间（小时） |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**策略设置枚举（StrategySetting）**：
- `disabled`: 禁用自动升级
- `fix_only`: 仅修复版本
- `latest`: 升级到最新版本

**升级模式枚举（UpgradeMode）**：
- `all`: 所有插件
- `partial`: 部分插件
- `exclude`: 排除指定插件

---

## 应用系统

### 8. apps（应用表）

**表名**: `apps`  
**用途**: 存储 AI 应用的基本信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 应用 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `name` | VARCHAR(255) | NOT NULL | 应用名称 |
| `description` | TEXT | NULLABLE | 应用描述 |
| `mode` | ENUM | NOT NULL | 应用模式 |
| `icon_type` | VARCHAR(255) | NULLABLE | 图标类型 |
| `icon` | VARCHAR(255) | NULLABLE | 图标 |
| `icon_background` | VARCHAR(255) | NULLABLE | 图标背景色 |
| `app_model_config_id` | UUID | NULLABLE | 当前配置 ID |
| `status` | VARCHAR(255) | NOT NULL, DEFAULT 'normal' | 应用状态 |
| `enable_site` | BOOLEAN | NOT NULL | 是否启用站点 |
| `enable_api` | BOOLEAN | NOT NULL | 是否启用 API |
| `api_rpm` | INTEGER | NOT NULL, DEFAULT 0 | API 每分钟请求数限制 |
| `api_rph` | INTEGER | NOT NULL, DEFAULT 0 | API 每小时请求数限制 |
| `created_by` | UUID | NULLABLE | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**应用模式枚举（AppMode）**：
- `completion`: 文本生成
- `workflow`: 工作流
- `chat`: 聊天
- `advanced-chat`: 高级聊天
- `agent-chat`: 智能体聊天

**索引**:
- `app_tenant_id_idx`: tenant_id 索引

---

### 9. app_model_configs（应用配置表）

**表名**: `app_model_configs`  
**用途**: 存储应用的模型配置（提示词、模型参数等）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 配置 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `provider` | VARCHAR(255) | NULLABLE | 模型提供商 |
| `model_id` | VARCHAR(255) | NULLABLE | 模型 ID |
| `configs` | JSON | NULLABLE | 配置详情（JSON） |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**说明**:
- `configs` 字段包含完整的配置信息，包括：
  - 提示词模板
  - 模型参数（温度、top_p 等）
  - 上下文配置
  - 文件上传配置
  - 建议问题配置

---

### 10. installed_apps（已安装应用表）

**表名**: `installed_apps`  
**用途**: 记录用户安装的应用（应用市场）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 安装记录 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `app_owner_tenant_id` | UUID | NOT NULL | 应用所有者租户 ID |
| `position` | INTEGER | NOT NULL, DEFAULT 0 | 排序位置 |
| `is_pinned` | BOOLEAN | NOT NULL, DEFAULT false | 是否置顶 |
| `last_used_at` | TIMESTAMP | NULLABLE | 最后使用时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

**唯一约束**:
- `unique_tenant_app`: (tenant_id, app_id) 组合唯一

---

## 工作流系统

### 11. workflows（工作流表）

**表名**: `workflows`  
**用途**: 存储工作流的定义（画布配置）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 工作流 ID |
| `tenant_id` | UUID | NOT NULL | 租户 ID |
| `app_id` | UUID | NOT NULL | 应用 ID |
| `type` | ENUM | NOT NULL | 工作流类型 |
| `version` | VARCHAR(255) | NOT NULL | 版本号（draft 为草稿） |
| `marked_name` | VARCHAR(255) | NOT NULL, DEFAULT '' | 标记名称 |
| `marked_comment` | VARCHAR(255) | NOT NULL, DEFAULT '' | 标记注释 |
| `graph` | TEXT | NOT NULL | 工作流图（JSON） |
| `features` | TEXT | NOT NULL | 特性配置（JSON） |
| `environment_variables` | TEXT | NOT NULL | 环境变量（JSON） |
| `conversation_variables` | TEXT | NOT NULL | 会话变量（JSON） |
| `rag_pipeline_variables` | TEXT | NOT NULL | RAG 管道变量（JSON） |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**工作流类型枚举（WorkflowType）**：
- `workflow`: 工作流应用
- `chat`: 聊天应用工作流
- `rag-pipeline`: RAG 管道

**索引**:
- `workflow_version_idx`: (tenant_id, app_id, version) 组合索引

**说明**:
- 每个应用可以有多个版本，`version = 'draft'` 表示草稿版本
- `graph` 字段包含完整的画布配置（节点、边等）

---

### 12. workflow_runs（工作流运行记录表）

**表名**: `workflow_runs`  
**用途**: 记录工作流的每次执行

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 运行 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `workflow_id` | UUID | NOT NULL | 工作流 ID |
| `type` | ENUM | NOT NULL | 工作流类型 |
| `triggered_from` | ENUM | NOT NULL | 触发来源 |
| `version` | VARCHAR(255) | NOT NULL | 版本号 |
| `graph` | TEXT | NOT NULL | 执行时的图（JSON） |
| `inputs` | TEXT | NULLABLE | 输入参数（JSON） |
| `status` | ENUM | NOT NULL | 运行状态 |
| `outputs` | TEXT | NULLABLE | 输出结果（JSON） |
| `error` | TEXT | NULLABLE | 错误信息 |
| `elapsed_time` | FLOAT | NOT NULL, DEFAULT 0 | 执行耗时（秒） |
| `total_tokens` | INTEGER | NOT NULL, DEFAULT 0 | 总 token 数 |
| `total_steps` | INTEGER | NOT NULL, DEFAULT 0 | 总步骤数 |
| `created_by_role` | ENUM | NOT NULL | 创建者角色 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `finished_at` | TIMESTAMP | NULLABLE | 完成时间 |

**运行状态枚举（WorkflowExecutionStatus）**：
- `running`: 运行中
- `succeeded`: 成功
- `failed`: 失败
- `stopped`: 已停止
- `paused`: 已暂停

**触发来源枚举（WorkflowRunTriggeredFrom）**：
- `debugging`: 调试
- `app-run`: 应用运行

---

### 13. workflow_node_executions（工作流节点执行表）

**表名**: `workflow_node_executions`  
**用途**: 记录工作流中每个节点的执行情况

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 执行 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `workflow_id` | UUID | NOT NULL | 工作流 ID |
| `triggered_from` | ENUM | NOT NULL | 触发来源 |
| `workflow_run_id` | UUID | NULLABLE, INDEX | 工作流运行 ID |
| `index` | INTEGER | NOT NULL | 执行顺序索引 |
| `predecessor_node_id` | VARCHAR(255) | NULLABLE | 前驱节点 ID |
| `node_id` | VARCHAR(255) | NOT NULL | 节点 ID |
| `node_type` | VARCHAR(255) | NOT NULL | 节点类型 |
| `title` | VARCHAR(255) | NOT NULL | 节点标题 |
| `inputs` | TEXT | NULLABLE | 输入（JSON） |
| `process_data` | TEXT | NULLABLE | 处理数据（JSON） |
| `outputs` | TEXT | NULLABLE | 输出（JSON） |
| `status` | ENUM | NOT NULL | 执行状态 |
| `error` | TEXT | NULLABLE | 错误信息 |
| `elapsed_time` | FLOAT | NOT NULL, DEFAULT 0 | 执行耗时（秒） |
| `execution_metadata` | TEXT | NULLABLE | 执行元数据（JSON） |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `finished_at` | TIMESTAMP | NULLABLE | 完成时间 |

---

## 知识库系统

### 14. datasets（知识库表）

**表名**: `datasets`  
**用途**: 存储知识库的基本信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 知识库 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `name` | VARCHAR(255) | NOT NULL | 知识库名称 |
| `description` | TEXT | NULLABLE | 知识库描述 |
| `provider` | VARCHAR(255) | NOT NULL, DEFAULT 'vendor' | 提供商类型 |
| `permission` | ENUM | NOT NULL, DEFAULT 'only_me' | 访问权限 |
| `data_source_type` | ENUM | NULLABLE | 数据源类型 |
| `indexing_technique` | ENUM | NULLABLE | 索引技术 |
| `index_struct` | TEXT | NULLABLE | 索引结构（JSON） |
| `embedding_model` | VARCHAR(255) | NULLABLE | 嵌入模型 |
| `embedding_model_provider` | VARCHAR(255) | NULLABLE | 嵌入模型提供商 |
| `keyword_number` | INTEGER | NULLABLE, DEFAULT 10 | 关键词数量 |
| `collection_binding_id` | UUID | NULLABLE | 集合绑定 ID |
| `retrieval_model` | JSON | NULLABLE | 检索模型配置 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**权限枚举（DatasetPermissionEnum）**：
- `only_me`: 仅创建者
- `all_team_members`: 所有团队成员
- `partial_members`: 部分成员

**索引技术枚举（IndexTechniqueType）**：
- `high_quality`: 高质量（使用嵌入模型）
- `economy`: 经济型（使用关键词）

**索引**:
- `dataset_tenant_idx`: tenant_id 索引

---

### 15. documents（文档表）

**表名**: `documents`  
**用途**: 存储知识库中的文档

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 文档 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `dataset_id` | UUID | NOT NULL, INDEX | 知识库 ID |
| `position` | INTEGER | NOT NULL | 排序位置 |
| `data_source_type` | VARCHAR(255) | NOT NULL | 数据源类型 |
| `data_source_info` | TEXT | NULLABLE | 数据源信息（JSON） |
| `dataset_process_rule_id` | UUID | NULLABLE | 处理规则 ID |
| `batch` | VARCHAR(255) | NOT NULL | 批次号 |
| `name` | VARCHAR(255) | NOT NULL | 文档名称 |
| `created_from` | ENUM | NOT NULL | 创建来源 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_api_request_id` | UUID | NULLABLE | API 请求 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `tokens` | INTEGER | NULLABLE | token 数 |
| `indexing_status` | ENUM | NULLABLE, DEFAULT 'waiting' | 索引状态 |
| `error` | TEXT | NULLABLE | 错误信息 |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true | 是否启用 |
| `disabled_at` | TIMESTAMP | NULLABLE | 禁用时间 |
| `disabled_by` | UUID | NULLABLE | 禁用者 ID |
| `archived` | BOOLEAN | NOT NULL, DEFAULT false | 是否归档 |
| `display_status` | VARCHAR(255) | NOT NULL | 显示状态 |
| `word_count` | INTEGER | NOT NULL | 字数 |
| `hit_count` | INTEGER | NOT NULL, DEFAULT 0 | 命中次数 |

**索引状态枚举（IndexingStatus）**：
- `waiting`: 等待处理
- `parsing`: 解析中
- `cleaning`: 清洗中
- `splitting`: 分段中
- `indexing`: 索引中
- `completed`: 已完成
- `error`: 错误
- `paused`: 已暂停

---

### 16. document_segments（文档分段表）

**表名**: `document_segments`  
**用途**：存储文档的分段（chunks）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 分段 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `dataset_id` | UUID | NOT NULL, INDEX | 知识库 ID |
| `document_id` | UUID | NOT NULL, INDEX | 文档 ID |
| `position` | INTEGER | NOT NULL | 位置 |
| `content` | TEXT | NOT NULL | 内容 |
| `word_count` | INTEGER | NOT NULL | 字数 |
| `tokens` | INTEGER | NOT NULL | token 数 |
| `keywords` | JSON | NULLABLE | 关键词 |
| `index_node_id` | VARCHAR(255) | NULLABLE | 索引节点 ID |
| `index_node_hash` | VARCHAR(255) | NULLABLE | 索引节点哈希 |
| `hit_count` | INTEGER | NOT NULL, DEFAULT 0 | 命中次数 |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true | 是否启用 |
| `disabled_at` | TIMESTAMP | NULLABLE | 禁用时间 |
| `disabled_by` | UUID | NULLABLE | 禁用者 ID |
| `status` | ENUM | NOT NULL, DEFAULT 'waiting' | 状态 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |
| `indexing_at` | TIMESTAMP | NULLABLE | 索引时间 |
| `completed_at` | TIMESTAMP | NULLABLE | 完成时间 |
| `error` | TEXT | NULLABLE | 错误信息 |
| `stopped_at` | TIMESTAMP | NULLABLE | 停止时间 |

**状态枚举（SegmentStatus）**：
- `waiting`: 等待处理
- `completed`: 已完成
- `error`: 错误
- `paused`: 已暂停

---

## 模型提供商系统

### 17. providers（提供商表）

**表名**: `providers`  
**用途**: 存储模型提供商配置

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 提供商 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `provider_name` | VARCHAR(255) | NOT NULL | 提供商名称 |
| `provider_type` | ENUM | NOT NULL, DEFAULT 'custom' | 提供商类型 |
| `encrypted_config` | TEXT | NULLABLE | 加密配置（JSON） |
| `is_valid` | BOOLEAN | NOT NULL, DEFAULT false | 是否有效 |
| `last_used` | TIMESTAMP | NULLABLE | 最后使用时间 |
| `quota_type` | ENUM | NULLABLE | 配额类型 |
| `quota_limit` | INTEGER | NULLABLE | 配额限制 |
| `quota_used` | INTEGER | NULLABLE, DEFAULT 0 | 已使用配额 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**提供商类型枚举（ProviderType）**：
- `custom`: 自定义
- `system`: 系统

**配额类型枚举（ProviderQuotaType）**：
- `trial`: 试用
- `paid`: 付费
- `free`: 免费

---

### 18. provider_models（提供商模型表）

**表名**: `provider_models`  
**用途**: 存储提供商的模型配置

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 模型 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `provider_id` | UUID | NOT NULL, INDEX | 提供商 ID |
| `model_name` | VARCHAR(255) | NOT NULL | 模型名称 |
| `model_type` | VARCHAR(255) | NOT NULL | 模型类型 |
| `encrypted_config` | TEXT | NULLABLE | 加密配置（JSON） |
| `is_valid` | BOOLEAN | NOT NULL, DEFAULT false | 是否有效 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_by` | UUID | NULLABLE | 更新者 ID |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

---

## 工具系统

### 19. tool_api_providers（API 工具提供商表）

**表名**: `tool_api_providers`  
**用途**: 存储 API 工具提供商配置

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 提供商 ID |
| `name` | VARCHAR(255) | NOT NULL | 提供商名称 |
| `icon` | VARCHAR(255) | NOT NULL | 图标 |
| `schema` | TEXT | NOT NULL | Schema 定义 |
| `schema_type_str` | VARCHAR(40) | NOT NULL | Schema 类型 |
| `user_id` | UUID | NOT NULL | 用户 ID |
| `tenant_id` | UUID | NOT NULL | 租户 ID |
| `description` | TEXT | NOT NULL | 描述 |
| `tools_str` | TEXT | NOT NULL | 工具列表（JSON） |
| `credentials_str` | TEXT | NOT NULL | 凭证（JSON） |
| `privacy_policy` | VARCHAR(255) | NULLABLE | 隐私政策 |
| `custom_disclaimer` | TEXT | NULLABLE | 自定义免责声明 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**唯一约束**:
- `unique_api_tool_provider`: (name, tenant_id) 组合唯一

---

### 20. tool_workflow_providers（工作流工具提供商表）

**表名**: `tool_workflow_providers`  
**用途**: 存储工作流工具提供商

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 提供商 ID |
| `name` | VARCHAR(255) | NOT NULL | 提供商名称 |
| `label` | VARCHAR(255) | NOT NULL | 标签 |
| `icon` | VARCHAR(255) | NOT NULL | 图标 |
| `app_id` | UUID | NOT NULL | 应用 ID |
| `version` | VARCHAR(255) | NOT NULL | 版本号 |
| `user_id` | UUID | NOT NULL | 用户 ID |
| `tenant_id` | UUID | NOT NULL | 租户 ID |
| `description` | TEXT | NOT NULL | 描述 |
| `parameter_configuration` | TEXT | NOT NULL | 参数配置（JSON） |
| `privacy_policy` | VARCHAR(255) | NULLABLE | 隐私政策 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

**唯一约束**:
- `unique_workflow_tool_provider`: (name, tenant_id) 组合唯一
- `unique_workflow_tool_provider_app_id`: (tenant_id, app_id) 组合唯一

---

## 其他辅助表

### 21. conversations（会话表）

**表名**: `conversations`  
**用途**: 存储聊天会话

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 会话 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `app_model_config_id` | UUID | NULLABLE | 模型配置 ID |
| `model_provider` | VARCHAR(255) | NULLABLE | 模型提供商 |
| `model_id` | VARCHAR(255) | NULLABLE | 模型 ID |
| `override_model_configs` | TEXT | NULLABLE | 覆盖配置（JSON） |
| `mode` | VARCHAR(255) | NOT NULL | 模式 |
| `name` | VARCHAR(255) | NOT NULL | 会话名称 |
| `summary` | TEXT | NULLABLE | 会话摘要 |
| `inputs` | JSON | NULLABLE | 输入参数 |
| `introduction` | TEXT | NULLABLE | 介绍 |
| `system_instruction` | TEXT | NULLABLE | 系统指令 |
| `system_instruction_tokens` | INTEGER | NOT NULL, DEFAULT 0 | 系统指令 token 数 |
| `status` | ENUM | NOT NULL | 状态 |
| `invoke_from` | ENUM | NULLABLE | 调用来源 |
| `from_source` | ENUM | NOT NULL | 来源 |
| `from_end_user_id` | UUID | NULLABLE, INDEX | 终端用户 ID |
| `from_account_id` | UUID | NULLABLE, INDEX | 账户 ID |
| `read_at` | TIMESTAMP | NULLABLE | 阅读时间 |
| `read_account_id` | UUID | NULLABLE | 阅读者 ID |
| `dialogue_count` | INTEGER | NULLABLE, DEFAULT 0 | 对话轮数 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

---

### 22. messages（消息表）

**表名**: `messages`  
**用途**: 存储聊天消息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 消息 ID |
| `app_id` | UUID | NOT NULL, INDEX | 应用 ID |
| `conversation_id` | UUID | NOT NULL, INDEX | 会话 ID |
| `model_provider` | VARCHAR(255) | NULLABLE | 模型提供商 |
| `model_id` | VARCHAR(255) | NULLABLE | 模型 ID |
| `override_model_configs` | TEXT | NULLABLE | 覆盖配置（JSON） |
| `inputs` | JSON | NULLABLE | 输入参数 |
| `query` | TEXT | NOT NULL | 用户输入 |
| `total_price` | DECIMAL(10,4) | NULLABLE | 总价格 |
| `message` | TEXT | NOT NULL | 消息内容（JSON） |
| `answer` | TEXT | NOT NULL | 回答内容 |
| `message_tokens` | INTEGER | NOT NULL, DEFAULT 0 | 消息 token 数 |
| `answer_tokens` | INTEGER | NOT NULL, DEFAULT 0 | 回答 token 数 |
| `provider_response_latency` | FLOAT | NOT NULL, DEFAULT 0 | 响应延迟（秒） |
| `total_price` | DECIMAL(10,4) | NULLABLE | 总价格 |
| `currency` | VARCHAR(255) | NULLABLE | 货币 |
| `from_source` | ENUM | NOT NULL | 来源 |
| `from_end_user_id` | UUID | NULLABLE, INDEX | 终端用户 ID |
| `from_account_id` | UUID | NULLABLE, INDEX | 账户 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |
| `agent_based` | BOOLEAN | NOT NULL, DEFAULT false | 是否基于 Agent |
| `workflow_run_id` | UUID | NULLABLE | 工作流运行 ID |

---

### 23. end_users（终端用户表）

**表名**: `end_users`  
**用途**: 存储应用的终端用户（非系统用户）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 用户 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `app_id` | UUID | NULLABLE | 应用 ID |
| `type` | ENUM | NOT NULL | 用户类型 |
| `external_user_id` | VARCHAR(255) | NULLABLE | 外部用户 ID |
| `name` | VARCHAR(255) | NULLABLE | 用户名称 |
| `is_anonymous` | BOOLEAN | NOT NULL, DEFAULT true | 是否匿名 |
| `session_id` | VARCHAR(255) | NOT NULL | 会话 ID |
| `last_active_at` | TIMESTAMP | NULLABLE | 最后活跃时间 |
| `last_used_at` | TIMESTAMP | NULLABLE | 最后使用时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `updated_at` | TIMESTAMP | NOT NULL | 更新时间 |

---

### 24. api_tokens（API 令牌表）

**表名**: `api_tokens`  
**用途**: 存储应用的 API 访问令牌

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 令牌 ID |
| `app_id` | UUID | NULLABLE, INDEX | 应用 ID |
| `dataset_id` | UUID | NULLABLE, INDEX | 知识库 ID |
| `token` | VARCHAR(255) | NOT NULL, UNIQUE | 令牌值 |
| `last_used_at` | TIMESTAMP | NULLABLE | 最后使用时间 |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

---

### 25. upload_files（上传文件表）

**表名**: `upload_files`  
**用途**: 存储上传的文件信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 文件 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `storage_type` | VARCHAR(255) | NOT NULL | 存储类型 |
| `key` | VARCHAR(255) | NOT NULL | 存储键 |
| `name` | VARCHAR(255) | NOT NULL | 文件名 |
| `size` | INTEGER | NOT NULL | 文件大小（字节） |
| `extension` | VARCHAR(255) | NOT NULL | 文件扩展名 |
| `mime_type` | VARCHAR(255) | NOT NULL | MIME 类型 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |
| `used_in` | TEXT | NULLABLE | 使用位置（JSON） |
| `used_by` | UUID | NULLABLE | 使用者 ID |
| `used_at` | TIMESTAMP | NULLABLE | 使用时间 |
| `hash` | VARCHAR(255) | NULLABLE | 文件哈希 |

---

### 26. tags（标签表）

**表名**: `tags`  
**用途**: 存储标签

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 标签 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `type` | VARCHAR(255) | NOT NULL | 标签类型 |
| `name` | VARCHAR(255) | NOT NULL | 标签名称 |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

---

### 27. tag_bindings（标签绑定表）

**表名**: `tag_bindings`  
**用途**: 存储标签与实体的绑定关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 绑定 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `tag_id` | UUID | NOT NULL, INDEX | 标签 ID |
| `target_id` | UUID | NOT NULL, INDEX | 目标 ID |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

---

### 28. operation_logs（操作日志表）

**表名**: `operation_logs`  
**用途**: 记录系统操作日志

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 日志 ID |
| `tenant_id` | UUID | NOT NULL, INDEX | 租户 ID |
| `action` | VARCHAR(255) | NOT NULL | 操作类型 |
| `content` | TEXT | NULLABLE | 操作内容（JSON） |
| `created_by` | UUID | NOT NULL | 创建者 ID |
| `created_at` | TIMESTAMP | NOT NULL | 创建时间 |

---

## 表关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户与权限系统                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐       ┌──────────────────────┐       ┌─────────┐ │
│  │ accounts │◄─────►│ tenant_account_joins │◄─────►│ tenants │ │
│  │  (用户)  │       │   (租户-用户关联)     │       │ (租户)  │ │
│  └──────────┘       │   - role (角色)      │       └─────────┘ │
│       │             └──────────────────────┘            │      │
│       │                                                 │      │
│       ▼                                                 ▼      │
│  ┌──────────────────┐                                   │      │
│  │account_integrates│                                   │      │
│  │  (第三方登录)     │                                   │      │
│  └──────────────────┘                                   │      │
│                                                         │      │
└─────────────────────────────────────────────────────────┼──────┘
                                                          │
┌─────────────────────────────────────────────────────────┼──────┐
│                        应用系统                          │      │
├─────────────────────────────────────────────────────────┼──────┤
│                                                         │      │
│  ┌─────────┐       ┌───────────────────┐               │      │
│  │  apps   │◄─────►│ app_model_configs │               │      │
│  │ (应用)  │       │   (应用配置)       │               │      │
│  └─────────┘       └───────────────────┘               │      │
│       │                                                 │      │
│       ▼                                                 │      │
│  ┌─────────────┐       ┌──────────────┐                │      │
│  │  workflows  │◄─────►│workflow_runs │                │      │
│  │  (工作流)   │       │ (运行记录)    │                │      │
│  └─────────────┘       └──────────────┘                │      │
│                                                         │      │
└─────────────────────────────────────────────────────────┼──────┘
                                                          │
┌─────────────────────────────────────────────────────────┼──────┐
│                       知识库系统                         │      │
├─────────────────────────────────────────────────────────┼──────┤
│                                                         │      │
│  ┌──────────┐       ┌───────────┐       ┌────────────┐ │      │
│  │ datasets │◄─────►│ documents │◄─────►│   segments │ │      │
│  │ (知识库) │       │  (文档)   │       │   (分段)   │ │      │
│  └──────────┘       └───────────┘       └────────────┘ │      │
│                                                         │      │
└─────────────────────────────────────────────────────────┼──────┘
                                                          │
┌─────────────────────────────────────────────────────────┼──────┐
│                      模型提供商系统                      │      │
├─────────────────────────────────────────────────────────┼──────┤
│                                                         │      │
│  ┌───────────┐       ┌─────────────────┐               │      │
│  │ providers │◄─────►│ provider_models │               │      │
│  │ (提供商)  │       │   (模型配置)     │               │      │
│  └───────────┘       └─────────────────┘               │      │
│                                                         │      │
└─────────────────────────────────────────────────────────┼──────┘
                                                          │
┌─────────────────────────────────────────────────────────┼──────┐
│                        聊天系统                          │      │
├─────────────────────────────────────────────────────────┼──────┤
│                                                         │      │
│  ┌──────────────┐       ┌──────────┐       ┌─────────┐ │      │
│  │ conversations│◄─────►│ messages │       │end_users│ │      │
│  │   (会话)     │       │  (消息)  │       │(终端用户)│ │      │
│  └──────────────┘       └──────────┘       └─────────┘ │      │
│                                                         │      │
└─────────────────────────────────────────────────────────┼──────┘
```

---

## 附录

### A. 常用索引说明

| 表名 | 索引名 | 字段 | 用途 |
|------|--------|------|------|
| accounts | account_email_idx | email | 邮箱登录查询 |
| tenants | - | - | 无额外索引 |
| tenant_account_joins | tenant_account_join_tenant_id_idx | tenant_id | 查询租户下的用户 |
| tenant_account_joins | tenant_account_join_account_id_idx | account_id | 查询用户所属的租户 |
| apps | app_tenant_id_idx | tenant_id | 查询租户下的应用 |
| datasets | dataset_tenant_idx | tenant_id | 查询租户下的知识库 |
| documents | document_dataset_id_idx | dataset_id | 查询知识库下的文档 |
| document_segments | document_segment_dataset_id_idx | dataset_id | 查询知识库下的分段 |

### B. 权限检查逻辑

```python
# 检查用户是否为租户管理员
def is_admin_or_owner(account: Account, tenant: Tenant) -> bool:
    """检查用户是否为租户的管理员或所有者"""
    join = get_tenant_account_join(tenant.id, account.id)
    return join.role in ['owner', 'admin']

# 检查用户是否有编辑权限
def has_edit_permission(account: Account, tenant: Tenant) -> bool:
    """检查用户是否有编辑权限"""
    join = get_tenant_account_join(tenant.id, account.id)
    return join.role in ['owner', 'admin', 'editor']

# 检查用户是否有知识库编辑权限
def is_dataset_editor(account: Account, tenant: Tenant) -> bool:
    """检查用户是否有知识库编辑权限"""
    join = get_tenant_account_join(tenant.id, account.id)
    return join.role in ['owner', 'admin', 'editor', 'dataset_operator']
```

### C. 数据隔离示例

```python
# 查询租户下的应用
def get_tenant_apps(tenant_id: str):
    """查询指定租户下的所有应用"""
    return db.session.query(App).filter(
        App.tenant_id == tenant_id,
        App.status == 'normal'
    ).all()

# 查询用户有权限的应用
def get_user_accessible_apps(account_id: str, tenant_id: str):
    """查询用户在指定租户下可访问的应用"""
    # 首先验证用户属于该租户
    join = db.session.query(TenantAccountJoin).filter(
        TenantAccountJoin.tenant_id == tenant_id,
        TenantAccountJoin.account_id == account_id
    ).first()
    
    if not join:
        return []  # 用户不属于该租户
    
    # 返回租户下的所有应用
    return db.session.query(App).filter(
        App.tenant_id == tenant_id,
        App.status == 'normal'
    ).all()
```

---

## 总结

本文档详细描述了 Dify 社区版的数据库设计，包括：

1. **数据库概览**：多租户架构设计、核心设计原则
2. **用户与权限系统**：accounts、tenants、tenant_account_joins、account_integrates、invitation_codes、account_plugin_permissions、tenant_plugin_auto_upgrade_strategies
3. **应用系统**：apps、app_model_configs、installed_apps
4. **工作流系统**：workflows、workflow_runs、workflow_node_executions
5. **知识库系统**：datasets、documents、document_segments
6. **模型提供商系统**：providers、provider_models
7. **工具系统**：tool_api_providers、tool_workflow_providers
8. **其他辅助表**：conversations、messages、end_users、api_tokens、upload_files、tags、tag_bindings、operation_logs
9. **表关系图**：展示各系统之间的关系
10. **附录**：常用索引说明、权限检查逻辑、数据隔离示例

**核心设计原则**：
- 多租户隔离：所有业务表都包含 tenant_id 字段
- 软删除：使用 enabled 字段实现软删除
- 审计字段：所有表包含 created_at、updated_at、created_by、updated_by 字段
- UUID 主键：使用 UUID 作为主键，支持分布式部署

**注意**：本文档描述的是社区版的数据库设计，不包含部门管理功能。部门管理功能的数据库设计请参考 `dify-database-design-department.md`。

---

**文档结束**
