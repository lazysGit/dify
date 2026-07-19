---
title: 技术架构
version: 1.0
last_updated: 2026-07-19
author: AI Assistant
status: draft
related_docs:
  - [总体架构全景图](../03-architecture-overview.md)
  - [基础设施架构](infrastructure.md)
---

# 技术架构

> **TL;DR**: Dify 后端基于 Python Flask + SQLAlchemy + Celery 构建，前端采用 Next.js App Router + React 19 + TypeScript，通过 Docker Compose 编排部署，支持 20+ 向量数据库和 20+ 对象存储后端。

## 概述

Dify 的技术栈围绕"Python 后端 + TypeScript 前端 + 容器化部署"三大支柱展开。后端以 Flask 为核心框架，配合 Celery 实现异步任务处理，SQLAlchemy 负责数据持久化。前端基于 Next.js App Router 构建，使用 React 19 和 TypeScript 保证类型安全。整个系统通过 Docker Compose 编排，支持多种数据库和存储后端的灵活切换。

## 详细设计

### 1. 后端技术栈

#### 1.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | >=3.11, <3.13 | 运行时环境 |
| Flask | ~3.1.2 | Web 框架 |
| SQLAlchemy | ~2.0.29 | ORM 和数据持久化 |
| Celery | ~5.6.2 | 异步任务队列 |
| Redis | ~7.3.0 | 缓存 + Celery Broker |
| Gunicorn | ~25.1.0 | WSGI 服务器 |
| gevent | ~25.9.1 | 协程并发 |

后端采用经典的 Flask 单体架构，通过 `app_factory.py` 初始化 20+ 个 Flask 扩展。Gunicorn 配合 gevent 实现高并发处理，Celery 将耗时任务（文档解析、工作流执行、邮件发送等）异步化。

#### 1.2 数据验证与序列化

| 技术 | 版本 | 用途 |
|------|------|------|
| Pydantic | ~2.12.5 | 数据验证和序列化 |
| pydantic-settings | ~2.13.1 | 配置管理 |
| Flask-RESTx | ~1.3.2 | API 文档和序列化 |
| flask-orjson | ~2.0.0 | 高性能 JSON 序列化 |

Pydantic v2 是后端数据验证的核心，所有 DTO 和配置模型均基于 Pydantic 构建。配置管理通过 `configs/dify_config` 单例实现，支持 680+ 个环境变量。

#### 1.3 数据库与迁移

| 技术 | 版本 | 用途 |
|------|------|------|
| SQLAlchemy | ~2.0.29 | ORM |
| Flask-Migrate | ~4.1.0 | 数据库迁移（Alembic） |
| psycopg2-binary | ~2.9.6 | PostgreSQL 驱动 |
| mysql-connector-python | >=9.3.0 | MySQL 驱动 |

支持 PostgreSQL（默认）和 MySQL 双数据库后端，通过 `DB_TYPE` 环境变量切换。数据库迁移使用 Alembic（通过 Flask-Migrate 封装）。

#### 1.4 模型集成与 AI 能力

| 技术 | 版本 | 用途 |
|------|------|------|
| litellm | 1.82.6 | 统一模型调用接口 |
| transformers | ~5.3.0 | Hugging Face 模型 |
| tiktoken | ~0.12.0 | Token 计数 |
| httpx | ~0.28.0 | HTTP 客户端 |
| SSE client | sseclient-py ~1.9.0 | 流式响应 |

litellm 提供统一的 LLM 调用抽象，支持数百个模型提供商。transformers 用于本地 Embedding 和 Tokenizer。httpx 配合 SSE 支持流式模型响应。

#### 1.5 文档处理

| 技术 | 版本 | 用途 |
|------|------|------|
| unstructured | ~0.21.5 | 文档解析（PDF/PPT/DOCX） |
| beautifulsoup4 | ~4.14.3 | HTML 解析 |
| markdown | ~3.10.2 | Markdown 处理 |
| python-docx | ~1.2.0 | Word 文档处理 |
| openpyxl | ~3.1.5 | Excel 处理 |
| pypdfium2 | 5.6.0 | PDF 渲染 |
| pypandoc | ~1.13 | Pandoc 封装 |
| jieba | 0.42.1 | 中文分词 |

RAG 管道的文档处理能力来自 unstructured 库，支持 PDF、PPT、DOCX 等多种格式。jieba 提供中文分词支持。

#### 1.6 可观测性

| 技术 | 版本 | 用途 |
|------|------|------|
| OpenTelemetry | 1.28.0 | 分布式追踪 |
| Sentry SDK | ~2.55.0 | 错误追踪 |
| Langfuse | ~2.51.3 | LLM 可观测性 |
| LangSmith | ~0.7.16 | LLM 可观测性 |
| Arize Phoenix | ~0.15.0 | LLM 可观测性 |
| Opik | ~1.10.37 | LLM 可观测性 |
| MLflow | >=3.0.0 | 实验追踪 |

后端集成了完整的可观测性体系：OpenTelemetry 负责分布式追踪，Sentry 捕获异常，Langfuse/LangSmith/Phoenix/Opik 提供 LLM 特定的可观测能力。

#### 1.7 向量数据库客户端

后端支持 20+ 向量数据库，通过 `vdb` 依赖组管理：

| 类别 | 支持的数据库 |
|------|-------------|
| 专用向量库 | Weaviate, Qdrant, Milvus, Chroma, PGVector, Pinecone (via upstash) |
| 搜索引擎 | ElasticSearch, OpenSearch, ClickHouse |
| 关系型扩展 | PGVecto.rs, TiDB Vector, OceanBase, Oracle, Couchbase |
| 云服务 | AnalyticDB, Tencent VectorDB, VikingDB, Relyt, PolarDB, Tablestore |
| 其他 | MyScale, GaussDB, LinDB, Azure AI Search, IRIS, mo-vector |

#### 1.8 对象存储客户端

通过 `storage` 依赖组支持多种存储后端：

| 存储 | SDK |
|------|-----|
| AWS S3 | boto3 |
| Azure Blob | azure-storage-blob |
| Google Cloud Storage | google-cloud-storage |
| 阿里云 OSS | oss2 |
| 腾讯云 COS | cos-python-sdk-v5 |
| 华为云 OBS | esdk-obs-python |
| 火山引擎 TOS | tos |
| 百度 BOS | bce-python-sdk |
| Supabase Storage | supabase |
| OpenDAL | opendal（统一存储抽象） |

#### 1.9 开发工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| uv | - | 包管理器（替代 poetry） |
| ruff | ~0.15.5 | 代码格式化和 lint |
| basedpyright | ~1.38.2 | 类型检查 |
| pyrefly | >=0.57.1 | 类型检查 |
| mypy | ~1.19.1 | 类型检查 |
| pytest | ~9.0.2 | 测试框架 |
| import-linter | >=2.3 | 架构边界检查 |

后端采用三重类型检查策略（basedpyright + pyrefly + mypy），这在开源项目中极为罕见，体现了对类型安全的极致追求。

### 2. 前端技术栈

#### 2.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.1 | React 框架（App Router） |
| React | 19.2.4 | UI 库 |
| TypeScript | 5.9.3 | 类型安全 |
| Tailwind CSS | 3.4.19 | 原子化 CSS |
| Node.js | ^22.22.1 | 运行时 |

前端基于 Next.js App Router 构建，采用 React 19 的最新特性。TypeScript 严格模式（`no-explicit-any: error`）确保类型安全。Tailwind CSS 通过 ESLint 插件强制类名排序一致性。

#### 2.2 状态管理与数据获取

| 技术 | 版本 | 用途 |
|------|------|------|
| Jotai | 2.18.1 | 原子化状态管理 |
| Zustand | 5.0.12 | 全局状态管理 |
| TanStack Query | 5.95.0 | 服务端状态管理 |
| Immer | 11.1.4 | 不可变数据更新 |
| nuqs | 2.8.9 | URL 状态同步 |

状态管理采用多方案并存策略：Jotai 处理细粒度原子状态，Zustand 管理全局状态，TanStack Query 负责服务端数据缓存和同步。

#### 2.3 API 集成

| 技术 | 版本 | 用途 |
|------|------|------|
| @orpc/client | 1.13.9 | API 客户端 |
| @orpc/contract | 1.13.9 | API 契约定义 |
| @orpc/tanstack-query | 1.13.9 | TanStack Query 集成 |
| ky | 1.14.3 | HTTP 客户端 |

API 层采用契约优先（contract-first）设计，通过 `contract/` 目录定义 API 契约，`service/` 目录提供 55 个 composable 消费这些契约。oRPC 实现了类型安全的端到端 API 调用。

#### 2.4 富文本与编辑器

| 技术 | 版本 | 用途 |
|------|------|------|
| Lexical | 0.42.0 | 富文本编辑器框架 |
| Monaco Editor | 4.7.0 | 代码编辑器 |
| react-syntax-highlighter | 15.6.6 | 代码高亮 |
| KaTeX | 0.16.40 | 数学公式渲染 |
| Mermaid | 11.13.0 | 图表渲染 |

Lexical 作为富文本编辑器核心，支持插件化扩展。Monaco Editor 提供代码编辑能力（用于工作流代码节点等场景）。

#### 2.5 可视化与图表

| 技术 | 版本 | 用途 |
|------|------|------|
| ReactFlow | 11.11.4 | 工作流画布 |
| ECharts | 6.0.0 | 数据图表 |
| ELKjs | 0.11.1 | 图布局算法 |
| html-to-image | 1.11.13 | DOM 转图片 |

ReactFlow 是工作流编辑器的核心，配合 ELKjs 实现自动布局。ECharts 用于数据分析和监控图表。

#### 2.6 国际化

| 技术 | 版本 | 用途 |
|------|------|------|
| i18next | 25.10.4 | 国际化框架 |
| react-i18next | 16.6.1 | React 集成 |
| @formatjs/intl-localematcher | 0.8.2 | 语言匹配 |
| negotiator | 1.0.0 | 内容协商 |

支持 23 种语言，通过 i18next 管理翻译资源。翻译采用 LLM 驱动方式（Claude Code Action 自动翻译）。

#### 2.7 UI 组件与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| @base-ui/react | 1.3.0 | 无样式基础组件 |
| @headlessui/react | 2.2.9 | 无样式交互组件 |
| @floating-ui/react | 0.27.19 | 浮层定位 |
| class-variance-authority | 0.7.1 | 组件变体管理 |
| tailwind-merge | 2.6.1 | Tailwind 类名合并 |
| @remixicon/react | 4.9.0 | 图标库 |
| emoji-mart | 5.6.0 | Emoji 选择器 |

UI 组件采用无样式（headless）设计，通过 Tailwind CSS 自定义样式。108 个基础组件位于 `app/components/base/`。

#### 2.8 构建与开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | 10.32.1 | 包管理器 |
| Vite+ | @voidzero-dev/vite-plus-core 0.1.13 | 构建工具 |
| Vitest | @voidzero-dev/vite-plus-test 0.1.13 | 测试框架 |
| ESLint | 10.1.0 | 代码检查 |
| Storybook | 10.3.1 | 组件开发 |
| Husky | 9.1.7 | Git hooks |
| knip | 6.0.2 | 死代码检测 |

前端使用 Vite+（@voidzero-dev 封装的 Vite）作为构建引擎，pnpm 管理依赖。Vitest 运行测试，Storybook 支持组件独立开发。

#### 2.9 可观测性

| 技术 | 版本 | 用途 |
|------|------|------|
| @sentry/react | 10.45.0 | 前端错误追踪 |
| @amplitude/analytics-browser | 2.37.0 | 用户行为分析 |
| @amplitude/plugin-session-replay-browser | 1.27.1 | 会话回放 |

### 3. 第三方服务和集成

#### 3.1 模型提供商

Dify 通过 litellm 和自研 model_runtime 支持数百个 LLM：

| 类别 | 提供商 |
|------|--------|
| 商业 API | OpenAI, Anthropic, Google Gemini, Azure OpenAI, Cohere, Mistral |
| 国内提供商 | 通义千问, 文心一言, 智谱 AI, 讯飞星火, 百川, 月之暗面, MiniMax, 深度求索 |
| 开源自部署 | Ollama, Xinference, vLLM, TGI, LocalAI |
| 兼容接口 | 任何 OpenAI API 兼容服务 |

#### 3.2 向量数据库

详见 1.7 节。支持 20+ 向量数据库，通过 `VECTOR_STORE` 环境变量切换。

#### 3.3 对象存储

详见 1.8 节。支持 20+ 对象存储后端，通过 `STORAGE_TYPE` 环境变量切换。

#### 3.4 邮件服务

| 服务 | SDK |
|------|-----|
| Resend | resend ~2.26.0 |
| SendGrid | sendgrid ~6.12.3 |
| SMTP | 内置支持 |

#### 3.5 可观测性平台

| 平台 | 用途 |
|------|------|
| Langfuse | LLM 应用可观测性 |
| LangSmith | LangChain 生态可观测性 |
| Arize Phoenix | LLM 追踪和评估 |
| Opik | Comet 出品的 LLM 可观测性 |
| Sentry | 全栈错误追踪 |
| OpenTelemetry | 分布式追踪标准 |

#### 3.6 安全与防护

| 组件 | 用途 |
|------|------|
| SSRF Proxy (Squid) | 出站请求安全代理 |
| Sandbox (dify-sandbox) | 代码执行沙箱 |
| bleach | HTML 清理 |
| PyCryptodome | 加密操作 |
| PyJWT | JWT 认证 |
| DOMPurify | 前端 XSS 防护 |

### 4. 技术选型决策

#### 4.1 为什么选择 Flask 而非 FastAPI？

Dify 早期选择 Flask 时，FastAPI 尚未成熟。Flask 生态成熟，插件丰富，社区庞大。迁移到 FastAPI 的成本极高（重写所有路由和中间件），且当前架构已能满足性能需求（通过 gevent 协程 + Celery 异步任务）。

**权衡：**
- Flask 生态成熟 vs FastAPI 原生异步
- 迁移成本高 vs 性能收益有限
- 团队熟悉度 vs 技术先进性

#### 4.2 为什么选择 Celery 而非原生异步？

Celery 提供了成熟的分布式任务队列方案，支持任务重试、优先级、定时任务等特性。Flask 的同步模型与 Celery 配合良好，避免了异步框架的复杂性。

**权衡：**
- 成熟稳定 vs 额外进程开销
- 功能丰富（重试、定时、优先级）vs 学习曲线
- 与 Flask 同步模型兼容 vs 原生 async 性能更优

#### 4.3 为什么选择 Next.js App Router？

Next.js App Router 提供了 React Server Components、流式渲染、路由级代码分割等现代特性。App Router 的布局系统（Route Groups）完美匹配 Dify 的多布局需求（认证布局、共享布局、人工输入布局）。

**权衡：**
- 现代特性丰富 vs 学习曲线陡峭
- SSR/SSG 灵活 vs 复杂度增加
- Vercel 生态 vs 自部署适配

#### 4.4 为什么选择 Tailwind CSS 而非 CSS-in-JS？

Tailwind CSS 的原子化方案避免了样式命名问题，配合 ESLint 插件强制一致性。运行时零开销，产物体积小。团队已形成肌肉记忆，开发效率高。

**权衡：**
- 开发效率高 vs HTML 中类名较长
- 一致性好 vs 需要 ESLint 强制
- 产物小 vs 学习成本

#### 4.5 为什么支持 20+ 向量数据库？

Dify 作为开源平台，用户部署环境多样。不同用户有不同偏好和基础设施约束。广泛支持降低了采用门槛，提升了平台适应性。

**权衡：**
- 用户选择多 vs 维护成本高
- 采用门槛低 vs 测试矩阵庞大
- 生态覆盖广 vs 深度集成难

#### 4.6 为什么使用 Vite+ 而非标准 Vite？

Vite+（@voidzero-dev 封装）在标准 Vite 基础上提供了针对 Next.js 的优化支持，使得 Next.js 项目也能享受 Vite 的开发体验。同时 vitest 通过 Vite+ 封装，保持了测试和构建的一致性。

#### 4.7 三重类型检查的意义

后端同时使用 basedpyright、pyrefly、mypy 三个类型检查器，这在开源项目中极为罕见。这种策略确保了：
- 类型推导的准确性（不同检查器互补）
- 代码质量的极致追求
- 减少运行时类型错误

**权衡：**
- 类型安全性极高 vs CI 时间长
- 早期发现错误 vs 开发体验受限
- 代码质量保障 vs 维护成本高

## 附录

### A. 技术栈清单表

| 层次 | 技术 | 版本 | 类别 |
|------|------|------|------|
| 后端 | Python | >=3.11 | 运行时 |
| 后端 | Flask | ~3.1.2 | Web 框架 |
| 后端 | SQLAlchemy | ~2.0.29 | ORM |
| 后端 | Celery | ~5.6.2 | 任务队列 |
| 后端 | Redis | ~7.3.0 | 缓存/Broker |
| 后端 | Pydantic | ~2.12.5 | 数据验证 |
| 后端 | litellm | 1.82.6 | 模型集成 |
| 前端 | Next.js | 16.2.1 | React 框架 |
| 前端 | React | 19.2.4 | UI 库 |
| 前端 | TypeScript | 5.9.3 | 类型系统 |
| 前端 | Tailwind CSS | 3.4.19 | 样式 |
| 前端 | TanStack Query | 5.95.0 | 数据获取 |
| 前端 | Jotai | 2.18.1 | 状态管理 |
| 前端 | ReactFlow | 11.11.4 | 工作流画布 |
| 基础设施 | PostgreSQL | 16 | 主数据库 |
| 基础设施 | MySQL | 8.0 | 备选数据库 |
| 基础设施 | Redis | 7 | 缓存/Broker |
| 基础设施 | Nginx | latest | 反向代理 |
| 基础设施 | Weaviate | - | 默认向量库 |
| 基础设施 | Docker Compose | - | 编排 |

### B. 依赖版本列表

#### 后端核心依赖（pyproject.toml）

```
flask~=3.1.2
sqlalchemy~=2.0.29
celery~=5.6.2
redis[hiredis]~=7.3.0
pydantic~=2.12.5
gunicorn~=25.1.0
gevent~=25.9.1
litellm==1.82.6
httpx[socks]~=0.28.0
tiktoken~=0.12.0
transformers~=5.3.0
```

#### 前端核心依赖（package.json）

```json
{
  "next": "16.2.1",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "typescript": "5.9.3",
  "tailwindcss": "3.4.19",
  "@tanstack/react-query": "5.95.0",
  "jotai": "2.18.1",
  "zustand": "5.0.12",
  "reactflow": "11.11.4",
  "echarts": "6.0.0",
  "lexical": "0.42.0",
  "i18next": "25.10.4",
  "zod": "4.3.6"
}
```

## 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-07-19 | 1.0 | 初始版本，基于 pyproject.toml 和 package.json 分析 | AI Assistant |
