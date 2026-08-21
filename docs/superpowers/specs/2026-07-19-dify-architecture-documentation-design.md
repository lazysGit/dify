---
title: Dify 架构文档体系设计方案
version: 1.1
last_updated: 2026-08-21
author: AI Assistant
status: draft
related_docs:
  - [Dify 项目 README](../../../README.md)
  - [API 文档](../../../api/README.md)
  - [Web 文档](../../../web/README.md)
  - [Docker 部署文档](../../../docker/README.md)
  - [实现计划](../plans/2026-07-19-dify-architecture-documentation.md)
---

# Dify 架构文档体系设计方案

> **TL;DR**: 为 Dify 设计一套 **24 篇** Markdown 架构文档体系，拆成 As-Is（事实诊断）与 To-Be（改造提案）两轨；As-Is 必须证据驱动，To-Be 必须挂需求来源后才能写工期/预算。服务于管理层、架构师、开发运维三类受众。

## 1. 项目背景与目标

### 1.1 背景

Dify 是一个开源的 LLM 应用开发平台，结合 AI 工作流、RAG 管道、智能体能力和模型管理。需要一套可维护的架构文档体系，用于：

- 准确描述开源仓库的现状架构（As-Is）
- 在有明确需求来源时，支持企业级改造提案（To-Be）
- 支持技术决策和架构评审
- 为运维与实施提供可查阅的专项说明

### 1.2 目标

设计一套**多文件模块化**的架构文档体系，满足：

1. **两轨分离**：As-Is（现在是什么）与 To-Be（要变成什么、怎么变）分开写，禁止混写导致虚构需求
2. **混合受众**：同时服务管理层、架构师、开发运维团队
3. **概念级 + 设计级**：既有架构理念，也有可核对代码路径的详细设计
4. **独立可维护**：每个主题独立成章，便于专项讨论和更新

### 1.3 范围与两轨划分

| 轨道 | 文档 | 约束 |
|------|------|------|
| **As-Is** | `02-current-architecture`、`03-architecture-overview`、`domains/*`（以现状为主）、`operations/*`（以现状能力与缺口证据为主） | 仅陈述可从仓库验证的事实；数字须现场计数；差距须附证据表 |
| **To-Be** | `platform-modification`、`permission-model`（目标态章节）、`knowledge-base-isolation`（目标态）、`audit-logging`（目标态）、`model-deployment`（目标部署方案）、`roadmap/*`、`01-executive-summary` 中的目标/资源/预算段 | **必须**声明需求来源（客户工单 / 产品决议 / 明确范围说明）；无来源时不得写工期、人力、美元成本 |
| **元文档** | `00-index` | 索引、阅读路径、全局术语表 |

文档主题清单：

- 现状架构诊断、总体架构全景图
- 7 个分域架构（业务/应用/数据/技术/安全/基础设施/治理）
- 模型部署、平台改造、权限模型、知识库隔离与共享审核、日志审计
- 运维保障（高可用/备份容灾/监控/容量）
- 实施规划（路线图/里程碑/资源/风险）
- 执行摘要、文档索引

### 1.4 需求来源闸门（To-Be）

编写任何 To-Be 文档或执行摘要中的改造/预算段落前，文档头部或概述中必须包含：

```markdown
requirements_source:
  - type: customer | product | internal  # 之一
  - ref: <工单/PRD/会议纪要路径或 URL>
  - confirmed_by: <角色或人名>
  - confirmed_at: YYYY-MM-DD
```

若 `requirements_source` 缺失：只允许写 As-Is 与“可选改进方向（非承诺）”，**禁止**里程碑工期与成本数字。

## 2. 文档体系设计

### 2.1 目录结构

```
docs/architecture/
├── 00-index.md                    # 文档索引 + 阅读路径指南
├── 01-executive-summary.md        # 执行摘要（面向管理层；全量完成后写）
├── 02-current-architecture.md     # 现状架构诊断（As-Is）
├── 03-architecture-overview.md    # 总体架构全景图（As-Is）
├── domains/                       # 分域架构（7 个领域，As-Is 为主）
│   ├── business.md
│   ├── application.md
│   ├── data.md
│   ├── technology.md
│   ├── security.md
│   ├── infrastructure.md
│   └── governance.md
├── model-deployment.md            # 模型部署（As-Is + 有来源时的 To-Be）
├── platform-modification.md       # 平台改造方案（To-Be）
├── permission-model.md            # 权限模型（As-Is 必写；目标态需来源）
├── knowledge-base-isolation.md    # 知识库隔离与共享（同上）
├── audit-logging.md               # 日志审计（同上）
├── operations/                    # 运维保障
│   ├── high-availability.md
│   ├── backup-disaster-recovery.md
│   ├── monitoring.md
│   └── capacity-planning.md
├── roadmap/                       # 实施规划（To-Be；需需求来源）
│   ├── implementation-roadmap.md
│   ├── milestones.md
│   ├── resource-plan.md
│   └── risk-assessment.md
└── diagrams/                      # 图表资源（优先 SVG；禁止 docx）
```

**总计：24 个 Markdown 文档 + `diagrams/` 资源目录**

计数口径：根层 4（含索引与执行摘要）+ domains 7 + 专项 5 + operations 4 + roadmap 4 = **24**。禁止再写“22 个文档”。

### 2.2 文档分层与受众

| 层级 | 受众 | 文档 | 阅读时间 |
|------|------|------|----------|
| 执行摘要层 | 管理层 | 01-executive-summary.md | 5-10 分钟 |
| 架构设计层 | 架构师/技术负责人 | 02-03 + domains/* + 专项方案 | 2-4 小时 |
| 实施指南层 | 开发/运维 | platform-modification + operations/* + roadmap/* | 按需查阅 |

### 2.3 阅读路径

**管理层路径：**
```
00-index.md → 01-executive-summary.md → 03-architecture-overview.md → roadmap/milestones.md
```

**架构师路径：**
```
00-index.md → 02-current-architecture.md → 03-architecture-overview.md → domains/* → platform-modification.md
```

**开发运维路径：**
```
00-index.md → platform-modification.md → operations/* → roadmap/implementation-roadmap.md
```

## 3. 文档内容框架

### 3.1 统一三层结构

```markdown
# [文档标题]

## 概述（1-2 页）
- 核心目标和范围（标明 As-Is / To-Be）
- 关键决策和结论
- 与其他文档的关联

## 详细设计（主体）
- 架构设计/方案说明
- 架构图、流程图、表格
- 设计决策和权衡分析
- 接口定义/数据模型（如适用）
- As-Is 文档：证据表（路径 + 结论）

## 附录（可选）
- 代码示例/配置示例
- 参考资料
- 术语表
```

### 3.2 事实数字计数口径

正文中的规模数字**不得**直接抄写 `AGENTS.md` 民俗值。编写时须现场计数并注明口径：

| 指标 | 计数方法 | 说明 |
|------|----------|------|
| `api/core/` 子目录数 | `ls -1d api/core/*/ \| wc -l` | 仅一级子目录 |
| 向量库种类 | 统计 `api/core/rag/datasource/vdb/vector_type.py` 中 `VectorType` 枚举项 | 可写 “N 种（枚举）” |
| GitHub Actions 工作流 | 统计 `.github/workflows/*.{yml,yaml}` | 不含 `.sh` |
| 环境变量 | 统计 `docker/.env.example` 中 `^[A-Z][A-Z0-9_]+=` 行 | 注明是否含注释掉的变量；勿写无法复现的 “680+” 除非计数结果支持 |
| 基础组件 | 统计 `web/app/components/base/` 下**一级**组件目录（排除 `icons/`） | 注明口径；禁止无口径写 “108” |

### 3.3 文档示例

#### 示例 1：`02-current-architecture.md`（As-Is）

```markdown
# 现状架构诊断

## 概述
- Dify 开源项目当前架构总结
- 核心优势和局限性（均需可引用路径）
- 差距分析仅列证据表中有依据的项

## 详细设计

### 1. 后端架构
- Flask + DDD 分层（引用 api/controllers、api/services、api/core）
- 核心模块：api/core/（子目录数 = 现场计数结果）
- 异步任务：Celery + Redis（引用 api/tasks、celery_entrypoint）

### 2. 前端架构
- Next.js App Router
- 状态管理：Jotai + TanStack Query（引用实际 import/包）
- 组件体系：按 §3.2 口径计数后填写

### 3. 数据架构
- PostgreSQL + Redis
- 向量数据库：按 VectorType 枚举计数
- 文件存储：S3 兼容等（引用配置）
- 环境变量：按 §3.2 口径计数

### 4. 部署架构
- Docker Compose 单镜像三进程（MODE=api/worker/beat）
- compose 由模板生成（勿手改 docker-compose.yaml）
- CI/CD：按 workflows 计数

### 5. 安全现状
- 对照 api/controllers/console/auth/ 与账户模型如实描述
- 不预设 “缺少 SSO”：先列已有能力（如 OAuth），再列证据支持的缺口

### 6. 差距分析（证据驱动）

| 声称缺口 | 证据（路径/行为） | 结论 |
|----------|-------------------|------|
| ... | ... | 确认缺口 / 已具备 / 部分具备 |

## 附录
- 核心模块依赖图（Mermaid）
- 环境变量分类清单（由计数生成）
```

#### 示例 2：`permission-model.md`

```markdown
# 权限模型设计

## 概述
- As-Is：基于 Tenant（= Workspace）的 RBAC（TenantAccountRole）
- To-Be：仅在 requirements_source 齐全时描述目标模型

## 详细设计

### 1. 现有权限模型（As-Is）
- 角色：owner / admin / editor / normal / dataset_operator
- 隔离边界：tenant_id（Workspace）
- 引用：api/models/account.py

### 2. 目标权限模型（To-Be，可选）
- 仅当需求来源已确认
- 明确标注哪些是新增概念（如部门、项目级），勿写成现状

## 附录
- 权限矩阵（As-Is）
```

## 4. 编写顺序与依赖关系

### 4.1 分阶段编写计划

```
阶段 0：脚手架
├── 目录结构
└── 00-index.md 骨架（文档清单可标 draft；终态在阶段 5 更新）

阶段 1：基础诊断（As-Is）
├── 02-current-architecture.md      # 现状诊断（含证据表）
└── 03-architecture-overview.md     # 全景图（依赖现状诊断）

阶段 2：分域设计（As-Is 为主）
├── domains/business.md
├── domains/application.md
├── domains/data.md
├── domains/technology.md
├── domains/security.md
├── domains/infrastructure.md
└── domains/governance.md

阶段 3：专项方案
├── model-deployment.md             # 先 As-Is；To-Be 需来源
├── permission-model.md             # 先 As-Is；目标态需来源
├── knowledge-base-isolation.md
├── audit-logging.md
└── platform-modification.md        # 纯 To-Be；无来源则只列可选方向、不写承诺

阶段 4：运维保障
├── operations/high-availability.md
├── operations/backup-disaster-recovery.md
├── operations/monitoring.md
└── operations/capacity-planning.md

阶段 5：实施规划与收束（To-Be 需来源）
├── roadmap/implementation-roadmap.md
├── roadmap/milestones.md
├── roadmap/resource-plan.md
├── roadmap/risk-assessment.md
├── 01-executive-summary.md         # 最后写；依赖以上全部
└── 00-index.md                     # 终态更新（链接、状态、术语）
```

人周估算仅作协作参考（约 11 周量级）；面向 AI 代理执行时按任务拆分与审查节奏推进，**不以 11 周日历为阻塞条件**。

### 4.2 关键依赖关系

- `01-executive-summary.md` 依赖所有其他内容文档（**阶段 5 最后写**）
- `platform-modification.md` 依赖分域 As-Is + 已确认的需求来源
- `knowledge-base-isolation.md` 的目标态依赖 `permission-model.md` 目标态
- `00-index.md` 骨架可早建，终态依赖全部文档完成
- 禁止在阶段 1 编写含工期/预算的执行摘要

## 5. 图表与可视化规范

### 5.1 图表类型与工具

| 图表类型 | 用途 | 工具 | 格式 |
|----------|------|------|------|
| 架构图 | 系统组件、分层、部署 | **默认 Mermaid**；复杂图可用 draw.io 导出 SVG | 内联 Mermaid 或 SVG |
| 流程图 | 业务流程、数据流 | Mermaid | 内联 Markdown |
| 时序图 | 交互流程、API 调用 | Mermaid | 内联 Markdown |
| ER 图 | 数据模型、表关系 | Mermaid | 内联 Markdown |
| 表格 | 对比分析、矩阵、清单 | Markdown 表格 | 内联 |

### 5.2 图表规范

1. **默认 Mermaid 内联**；仅当图过于复杂无法维护时，才使用 SVG 文件
2. **命名规范**（SVG）：`<文档名>-<图表类型>-<编号>.svg`
3. **存放位置**：统一 `docs/architecture/diagrams/`（不要在 `domains/diagrams/` 再散落一份）
4. **禁止**将 `.docx` 作为架构文档交付物
5. **配色**：可读性优先；若使用品牌色，保持同文档内一致

### 5.3 图表数量建议

| 文档 | 最少图表数 | 关键图表 |
|------|-----------|----------|
| 02-current-architecture | 4 | 系统分层图、模块依赖图、部署拓扑图、数据流图 |
| 03-architecture-overview | 3 | 全景图、组件交互图、技术栈图 |
| 每个 domains/*.md | 2-3 | 领域架构图、数据模型图、流程图 |
| platform-modification | 4 | 改造前后对比图、集成架构图、迁移流程图 |
| permission-model | 3 | 权限模型图、RBAC 关系图、授权流程图 |
| operations/*.md | 2 | 部署拓扑图、监控架构图 |
| roadmap/*.md | 2 | 甘特图、里程碑时间线 |

## 6. 文档质量标准

### 6.1 可检查质量清单

每个文档完成后须通过：

#### 结构完整性
- [ ] 含概述、详细设计；附录按需
- [ ] front matter 含 title / version / last_updated / author / status
- [ ] To-Be 文档或段落含 `requirements_source`（或明确标注“无来源，仅可选方向”）

#### 内容准确性（可核对）
- [ ] 关键断言附带仓库路径或配置键名
- [ ] 规模数字附带 §3.2 计数口径与结果
- [ ] As-Is 差距分析含证据表，无无依据口号
- [ ] 术语与 §6.3 及 `api/models/account.py` 一致

#### 可追溯性
- [ ] 引用相关代码/配置路径
- [ ] 与其他文档的相对链接可解析
- [ ] 变更日志已更新

#### 交付物约束
- [ ] 正文为 Markdown；图表为 Mermaid 或 SVG
- [ ] 无新增 `.docx` 作为主交付物

### 6.2 文档头部模板

```markdown
---
title: [文档标题]
version: 1.0
last_updated: YYYY-MM-DD
author: [作者]
status: draft | review | approved
track: as-is | to-be | mixed
requirements_source: []   # To-Be / mixed 时按 §1.4 填写
related_docs:
  - [相关文档 1](link)
---

# [文档标题]

> **TL;DR**: 一句话总结
```

### 6.3 术语表

在 `00-index.md` 维护全局术语表。须与代码一致：

| 术语 | 英文 | 定义 |
|------|------|------|
| 租户 / 工作空间 | Tenant / Workspace | **同一概念**：UI 称 Workspace，数据模型为 `Tenant`，隔离键为 `tenant_id`。不存在独立的“项目级 Workspace”实体 |
| 账户 | Account | 登录用户；通过 `TenantAccountJoin` 加入工作空间并携带角色 |
| 角色 | TenantAccountRole | owner / admin / editor / normal / dataset_operator |
| 知识库 | Knowledge Base / Dataset | RAG 数据集与向量索引 |
| 工作流 | Workflow | 可视化编排的 AI 应用流程 |
| 智能体 | Agent | 具备工具调用能力的 AI 应用 |
| 模型提供商 | Model Provider | LLM 服务供应商 |
| 向量数据库 | Vector Database | 存储文本嵌入；种类以 `VectorType` 为准 |
| DDD | Domain-Driven Design | 后端分层：Controller → Service → Core/Domain |
| RAG | Retrieval-Augmented Generation | 检索增强生成 |
| 项目级隔离 | （目标态） | **非现状**：若 To-Be 引入，须标明为新增概念并挂需求来源 |

### 6.4 变更日志模板

```markdown
## 变更日志

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0 | 2026-07-19 | [作者] | 初始版本 |
```

## 7. 交付物清单

### 7.1 文档交付物

- [ ] 24 个 Markdown 文档（符合统一模板与两轨约束）
- [ ] `docs/architecture/diagrams/`（Mermaid 内联为主；SVG 按需）
- [ ] 文档索引（00-index.md）含术语表
- [ ] **不包含** `.docx` 主交付物

### 7.2 质量交付物

- [ ] 每篇通过 §6.1 清单
- [ ] 文档评审记录
- [ ] 变更日志

## 8. 风险与缓解措施

### 8.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 代码快速迭代导致文档过时 | 高 | 重大变更后更新相关 As-Is；数字按 §3.2 重计 |
| 架构图与实现不一致 | 中 | 审查时对照代码；优先 Mermaid 便于 diff |
| 配置项变更频繁 | 中 | 环境变量清单由 `.env.example` 计数生成 |
| 无需求来源写改造与预算 | 高 | §1.4 闸门；违规段落删除或降级为可选方向 |

### 8.2 资源风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 全量重写成本高 | 中 | `docs/architecture/` 已有落盘时优先**增量修订**，不默认 11 周重做 |
| 多作者风格不一致 | 低 | 统一模板 + §6.1 |
| 领域知识不足 | 高 | 同行评审；As-Is 以代码为准 |

## 9. 附录

### 9.1 参考资料

- Dify 官方文档：https://docs.dify.ai
- Dify GitHub 仓库：https://github.com/langgenius/dify
- Flask / Next.js / Celery 官方文档

### 9.2 相关文档

- [Dify 项目 README](../../../README.md)
- [API 文档](../../../api/README.md)
- [Web 文档](../../../web/README.md)
- [Docker 部署文档](../../../docker/README.md)
- [实现计划](../plans/2026-07-19-dify-architecture-documentation.md)

## 变更日志

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0 | 2026-07-19 | AI Assistant | 初始版本 |
| 1.1 | 2026-08-21 | AI Assistant | 评审修订：24 篇计数、As-Is/To-Be 两轨、术语对齐 Tenant=Workspace、证据驱动差距、修正相对链接、Mermaid 优先、可检查质量门禁、执行摘要置于阶段 5 末 |
