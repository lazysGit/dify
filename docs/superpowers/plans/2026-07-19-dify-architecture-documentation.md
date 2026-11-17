# Dify 架构文档体系实现计划

> **状态（2026-08-21）：`partially-executed`。** `docs/architecture/` 已有 24 篇落盘。默认策略为 **对照修订后的设计规格做增量修订**，禁止按本计划从零全量重跑 11 周。仅当目标文件缺失或与规格严重冲突时，才按对应任务新建/重写。
>
> **面向 AI 代理：** 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans。步骤用 `- [ ]` 跟踪。遵守设计规格中的 As-Is / To-Be 两轨与需求来源闸门。

**目标：** 维护一套 **24** 篇架构文档（根 4 + domains 7 + 专项 5 + operations 4 + roadmap 4），覆盖 As-Is 诊断与（有需求来源时的）To-Be 改造提案。

**架构：** 多文件模块化；三层结构（概述 → 详细设计 → 附录）；三类受众。

**技术栈：** Markdown + Mermaid（默认）+ 可选 SVG + YAML front matter。禁止 `.docx` 作为主交付物。

**设计规格：** `docs/superpowers/specs/2026-07-19-dify-architecture-documentation-design.md`（v1.1+）

---

## 执行原则（评审修订）

1. **As-Is 先于 To-Be**：无 `requirements_source` 时，改造/工期/预算段落只可写“可选方向”，不可写成承诺。
2. **数字现场计数**：禁止直接抄 `AGENTS.md` 的 40 / 108 / 680+ / 22 等民俗值；按规格 §3.2 计数并写明口径。
3. **证据驱动差距**：差距分析必须有路径/行为证据表。
4. **术语**：Tenant ≡ Workspace（`tenant_id`）；“项目级 Workspace”若出现须标为 To-Be 新概念。
5. **写作顺序**：执行摘要在全部内容文档之后；索引可先骨架、后终态。
6. **增量优先**：已存在的 `docs/architecture/*.md` 以修订为主，除非文件缺失。

### 计数命令（任务中复用）

```bash
# core 一级子目录
ls -1d api/core/*/ | wc -l

# VectorType 枚举项（人工或脚本统计 vector_type.py）
rg -c '^\s+[A-Z0-9_]+ = ' api/core/rag/datasource/vdb/vector_type.py

# GitHub Actions 工作流
ls -1 .github/workflows/*.{yml,yaml} 2>/dev/null | wc -l

# 环境变量（docker 模板中 KEY= 行）
rg -c '^[A-Z][A-Z0-9_]+=' docker/.env.example

# base 一级组件目录（排除 icons）
ls -1d web/app/components/base/*/ | grep -v '/icons$' | wc -l
```

---

## 文件结构

```
docs/architecture/
├── 00-index.md
├── 01-executive-summary.md        # 阶段 5 最后写
├── 02-current-architecture.md
├── 03-architecture-overview.md
├── domains/                       # 7
├── model-deployment.md
├── platform-modification.md
├── permission-model.md
├── knowledge-base-isolation.md
├── audit-logging.md
├── operations/                    # 4
├── roadmap/                       # 4
└── diagrams/                      # 统一图表目录；勿再散落 domains/diagrams 作为主源
```

**总计 24 篇 Markdown。**

---

## 阶段 0–1：脚手架与基础诊断（As-Is）

### 任务 1：创建/核对目录与索引骨架

**文件：** `docs/architecture/00-index.md` 及子目录

- [ ] **步骤 1：确保目录存在**

```bash
mkdir -p docs/architecture/{domains,operations,roadmap,diagrams}
```

- [ ] **步骤 2：编写或修订索引骨架**

`00-index.md` 须含：front matter、概述、**24** 篇清单表（状态可 draft）、三种阅读路径、全局术语表（Tenant=Workspace）、变更日志。

- [ ] **步骤 3：验证**

```bash
find docs/architecture -maxdepth 2 -type f -name '*.md' | sort
```

- [ ] **步骤 4：Commit（若有变更）**

```bash
git add docs/architecture/00-index.md
git commit -m "docs: refresh architecture index skeleton (24 docs, glossary)"
```

---

### 任务 2：现状架构诊断（As-Is）

**文件：** `docs/architecture/02-current-architecture.md`

- [ ] **步骤 0：现场计数**（将结果写入文档，附口径）

运行上文“计数命令”，记录 core 子目录数、VectorType 数、workflows 数、env 行数、base 组件目录数。

- [ ] **步骤 1：分析后端**

阅读：`api/app_factory.py`、`api/dify_app.py`、`api/configs/`、`api/extensions/`、`api/core/`、`api/tasks/`。

- [ ] **步骤 2：分析前端**

阅读：`web/app/layout.tsx`、`web/env.ts`、`web/contract/`、`web/service/`、`web/app/components/`。组件数量用计数结果，不写死 108。

- [ ] **步骤 3：分析数据**

阅读：`docker/docker-compose-template.yaml`、`api/models/`、`api/core/rag/`、`vector_type.py`。

- [ ] **步骤 4：分析部署**

阅读：`docker/`、`.github/workflows/`。确认单镜像三进程与 compose 生成机制。

- [ ] **步骤 5：分析安全（先证据后结论）**

阅读：`api/controllers/console/auth/`、`api/models/account.py`、`docs/eu-ai-act-compliance.md`。

填写证据表后再写差距；**禁止**预设“缺少 SSO”等口号。

- [ ] **步骤 6：编写/修订文档**

`track: as-is`。含概述、详细设计、**差距证据表**、附录（Mermaid 图 + 配置分类）。TL;DR 不得含无证据的改造承诺。

- [ ] **步骤 7：Mermaid 图（内联）**

系统分层、模块依赖、部署拓扑、数据流 —— 至少 4 张。

- [ ] **步骤 8：质量检查**

对照规格 §6.1（可检查项）；含路径引用与计数口径。

- [ ] **步骤 9：Commit**

```bash
git add docs/architecture/02-current-architecture.md
git commit -m "docs: revise current architecture diagnosis (evidence-based)"
```

---

### 任务 3：总体架构全景图（As-Is）

**文件：** `docs/architecture/03-architecture-overview.md`  
**依赖：** 任务 2

- [ ] **步骤 1：** 从 `02-current-architecture.md` 提取组件与数据流
- [ ] **步骤 2：** 编写/修订四层全景（展示/应用/核心/基础设施）+ Mermaid
- [ ] **步骤 3：** 质量检查（§6.1）+ Commit

```bash
git add docs/architecture/03-architecture-overview.md
git commit -m "docs: revise architecture overview"
```

---

## 阶段 2：分域设计（As-Is 为主）

以下任务若文件已存在：增量修订术语、证据路径与计数；不无故全量重写。

### 任务 4：业务架构

**文件：** `docs/architecture/domains/business.md`  
阅读：`api/core/app/`、`api/core/workflow/`、`api/core/rag/`、`api/core/agent/`  
- [ ] 编写/修订 + ≥2 Mermaid 流程图 + §6.1 + Commit  
`git commit -m "docs: revise business architecture"`

### 任务 5：应用架构

**文件：** `docs/architecture/domains/application.md`  
阅读：`api/controllers/`、`api/services/`、`web/app/components/`、`web/service/`  
- [ ] 编写/修订 + 应用架构图 + §6.1 + Commit

### 任务 6：数据架构

**文件：** `docs/architecture/domains/data.md`  
阅读：`api/models/`、`api/migrations/`、`api/core/rag/`、compose 模板  
- [ ] 编写/修订 + ER（Mermaid）+ §6.1 + Commit

### 任务 7：技术架构

**文件：** `docs/architecture/domains/technology.md`  
阅读：`api/pyproject.toml`、`web/package.json`、`docker/`  
- [ ] 计数后填写依赖规模；技术栈图 + §6.1 + Commit

### 任务 8：安全架构

**文件：** `docs/architecture/domains/security.md`  
阅读：auth 控制器、`account.py`、合规文档  
- [ ] As-Is 如实描述；To-Be 仅在有 `requirements_source` 时展开 + §6.1 + Commit

### 任务 9：基础设施架构

**文件：** `docs/architecture/domains/infrastructure.md`  
阅读：`docker/`、`.github/workflows/`、`api/extensions/`  
- [ ] workflows/env 用计数结果；部署拓扑 Mermaid + §6.1 + Commit

### 任务 10：治理架构

**文件：** `docs/architecture/domains/governance.md`  
阅读：`AGENTS.md`、`.github/`、`api/configs/`  
- [ ] 配置/变更/合规治理 + §6.1 + Commit

---

## 阶段 3：专项方案

### 任务 11：模型部署

**文件：** `docs/architecture/model-deployment.md`  
阅读：`api/core/model_runtime/`、模型相关 entities/models  
- [ ] 先 As-Is 调用链；To-Be 部署方案仅在有需求来源时写 + 架构图 + §6.1 + Commit

### 任务 12：平台改造（To-Be）

**文件：** `docs/architecture/platform-modification.md`

- [ ] **步骤 1：** 确认 `requirements_source`；若无来源，文档仅列“可选改进方向”，删除或降级工期/预算承诺
- [ ] **步骤 2：** 有来源时：按优先级写改造方案、兼容与迁移
- [ ] **步骤 3：** 对比图（Mermaid）+ §6.1 + Commit

### 任务 13：权限模型

**文件：** `docs/architecture/permission-model.md`  
阅读：`api/models/account.py`、auth、`account_service`  

- [ ] As-Is：TenantAccountRole 五级 + tenant 隔离（Tenant=Workspace）
- [ ] To-Be（RBAC+ABAC/部门等）：仅当需求来源齐全
- [ ] 权限图 + §6.1 + Commit

### 任务 14：知识库隔离与共享

**文件：** `docs/architecture/knowledge-base-isolation.md`  
阅读：`api/core/rag/`、`api/models/dataset.py`、dataset service  
- [ ] As-Is 访问控制；目标共享/审核流程需来源 + 图 + §6.1 + Commit

### 任务 15：日志审计

**文件：** `docs/architecture/audit-logging.md`  
阅读：审计相关 models/services（先搜索再写）  
- [ ] As-Is 机制证据表；目标方案需来源 + 流程图 + §6.1 + Commit

---

## 阶段 4：运维保障

### 任务 16：高可用

**文件：** `docs/architecture/operations/high-availability.md`

- [ ] **步骤 1：As-Is** — 阅读 `docker/docker-compose-template.yaml`、`docker/nginx/`、API/worker/beat 进程模型；记录默认单实例与可水平扩展点
- [ ] **步骤 2：证据表** — 组件 / 单点风险 / 现有缓解（路径）
- [ ] **步骤 3：To-Be** — 仅有需求来源时写多副本、LB、会话与队列 HA；否则标“可选方向”
- [ ] **步骤 4：** Mermaid 部署拓扑 ≥2 + 统一模板正文 + §6.1
- [ ] **步骤 5：Commit** — `docs: revise high availability architecture`

### 任务 17：备份与容灾

**文件：** `docs/architecture/operations/backup-disaster-recovery.md`

- [ ] **步骤 1：As-Is** — PostgreSQL/Redis/对象存储/向量库数据位置（compose volumes、storage 配置）
- [ ] **步骤 2：** RPO/RTO 若无业务给定，只列技术可选项，不编造承诺值
- [ ] **步骤 3：** 备份/恢复流程图（Mermaid）≥2 + §6.1 + Commit  
  `docs: revise backup and disaster recovery plan`

### 任务 18：监控体系

**文件：** `docs/architecture/operations/monitoring.md`

- [ ] **步骤 1：As-Is** — 阅读 `api/core/ops/`、日志与 tracing 相关扩展/配置；列出已有可观测性能力
- [ ] **步骤 2：证据表** — 指标/日志/追踪 有无与路径
- [ ] **步骤 3：To-Be** — 需来源；无则可选方向
- [ ] **步骤 4：** 监控架构 Mermaid ≥2 + §6.1 + Commit  
  `docs: revise monitoring system`

### 任务 19：容量与性能

**文件：** `docs/architecture/operations/capacity-planning.md`

- [ ] **步骤 1：As-Is** — Gunicorn/gevent、Celery、DB/Redis 池相关配置键（从 `.env.example` 计数分类，不写死 680+）
- [ ] **步骤 2：** 扩展模式（垂直/水平/worker）与已知限制（代码或文档依据）
- [ ] **步骤 3：** 容量相关示意/表格 ≥2 + §6.1 + Commit  
  `docs: revise capacity planning`

---

## 阶段 5：实施规划与收束

> To-Be 文档。无需求来源时：可保留风险与技术依赖说明，**不得**写美元预算与固定工期承诺。

### 任务 20：实施路线图

**文件：** `docs/architecture/roadmap/implementation-roadmap.md`

- [ ] **步骤 1：** 汇总平台改造与专项中**已确认来源**的项；无来源项不进承诺甘特
- [ ] **步骤 2：** 分阶段路线（Mermaid gantt 或时间线）≥2
- [ ] **步骤 3：** §6.1 + Commit — `docs: revise implementation roadmap`

### 任务 21：里程碑

**文件：** `docs/architecture/roadmap/milestones.md`

- [ ] 定义可验收里程碑（交付物清单，非空话）+ 时间线（有来源才写日期）+ §6.1 + Commit

### 任务 22：资源计划

**文件：** `docs/architecture/roadmap/resource-plan.md`

- [ ] 有来源：人力/技能/外部依赖表；无来源：标注“待需求确认”，删除虚构成本  
- [ ] §6.1 + Commit

### 任务 23：风险评估

**文件：** `docs/architecture/roadmap/risk-assessment.md`

- [ ] 风险矩阵（影响×概率）基于 As-Is 证据与已确认改造范围 + Mermaid/表格 ≥2 + §6.1 + Commit

### 任务 24：执行摘要（最后写内容文档）

**文件：** `docs/architecture/01-executive-summary.md`  
**依赖：** 任务 2–23 均已达到可引用状态

- [ ] **步骤 1：** 汇总 As-Is 优势/局限（来自 02 与证据表）
- [ ] **步骤 2：** 目标与路线仅引用有 `requirements_source` 的结论；禁止编造“22 周 / 79.7 万美元”类无来源数字
- [ ] **步骤 3：** 关键决策列表（需管理层拍板的事项）
- [ ] **步骤 4：** §6.1 + Commit — `docs: revise executive summary from completed docs`

### 任务 25：索引终态

**文件：** `docs/architecture/00-index.md`

- [ ] 清单改为 **24** 篇；状态与链接正确；术语表与规格 §6.3 一致（Tenant=Workspace）
- [ ] 全文检索替换错误的“22 个文档”口径
- [ ] Commit — `docs: finalize architecture index (24 docs)`

---

## 自检

### 1. 规格覆盖度

| 规格项 | 任务 |
|--------|------|
| 索引 | 1, 25 |
| 现状 / 全景 | 2, 3 |
| 7 分域 | 4–10 |
| 专项五篇 | 11–15 |
| 运维四篇 | 16–19 |
| 路线图四篇 | 20–23 |
| 执行摘要（最后） | 24 |

### 2. 占位符与空洞（诚实扫描）

- 任务 16–23 已补齐必读路径、证据/来源约束、图表下限与 DoD（§6.1）
- 若某步骤仍无法在仓库找到对应实现：在文档中写“未找到实现”，不得编造
- 已知限制：To-Be 工期/预算依赖外部需求来源，计划无法凭空补全

### 3. 一致性

- 文档数口径：**24**
- 术语：Tenant = Workspace
- 图表：默认 Mermaid；禁止新增 docx 主交付物
- 与已落盘产物关系：**增量修订**，非默认全量重写

### 4. 相对本计划历史版本的变更（2026-08-21）

- 执行摘要从原“阶段 1 任务 4”移至阶段 5 任务 24
- 运维/路线图任务补强至与现状诊断同级可执行性
- 修正虚假自检（旧版声称“无模糊步骤”不成立）
- 标记 `partially-executed` 与增量策略

---

**修订后的计划与规格对齐。** 后续执行请优先：任务 2/24/25 相关的事实纠错（计数、术语、无来源预算），再按需推进其余增量修订。
