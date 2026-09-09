# AGENTS.md

**生成日期**: 2026-07-04
**分支**: main

## 用户约束

- **沟通语言**: 使用简体中文
- **文档格式**: 不使用 emoji 字符
- **GitHub 访问**: 失败时使用 gh-proxy 重试
- **Python 运行/测试**: 全部使用 `uv`，初始化虚拟环境使用 `uv venv` 或 `uv sync --group dev`
- **Python 包管理**: 全部使用 `uv`，统一使用 `uv run --project api` 执行 Python 命令
- **测试流程**: 所有修复与功能验证必须先由 Agent 用浏览器把受影响流程测一遍（点击、输入、提交、跳转，确认行为而非只看截图或单测），通过后再交用户手动测试。未完成浏览器验证不得声称完成，也不得直接让用户手测；若登录墙等导致无法浏览器验证，须明确写出已验证项、阻塞原因和请用户手测的具体步骤

## 概述

Dify 是开源 LLM 应用开发平台，集成 AI 工作流、RAG 管道、Agent 能力和模型管理。Monorepo 架构：Python Flask 后端 (DDD) + Next.js 前端。

## STRUCTURE

```
dify/
├── api/            # Python Flask backend (DDD: controllers → services → core → models)
├── web/            # Next.js App Router frontend (TypeScript, React)
├── docker/         # Docker Compose 部署（自动生成！）
├── sdks/           # Client SDKs (nodejs-client, php-client)
├── dev/            # 开发脚本
├── scripts/        # 杂项脚本（压力测试等）
├── docs/           # 多语言 README（23 种语言）
├── images/         # 营销图片
├── .github/        # CI/CD（22 个工作流）
├── .agents/        # AI agent 配置
├── .claude/        # Claude 专用配置
├── .gemini/        # Gemini 专用配置
└── .codegraph/     # IDE 索引产物（已提交！）
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Backend API | `api/` | Flask + DDD，详见 `api/AGENTS.md` |
| Frontend UI | `web/` | Next.js App Router，详见 `web/AGENTS.md` |
| Docker 部署 | `docker/` | 自动生成的 compose，详见 `docker/AGENTS.md` |
| SDK 开发 | `sdks/` | Node.js + PHP 客户端，详见 `sdks/AGENTS.md` |
| 开发脚本 | `dev/` | 本地开发 Shell 脚本 |
| CI/CD | `.github/workflows/` | 22 个 GitHub Actions 工作流 |
| 配置 | `api/configs/`、`web/env.ts` | Pydantic settings（后端）、t3/env（前端） |
| 数据库迁移 | `api/migrations/` | Alembic/Flask-Migrate |
| 异步任务 | `api/tasks/`、`api/schedule/` | Celery 任务 + beat 调度 |
| 前端组件 | `web/app/components/` | 108 个基础组件，workflow 画布 |
| i18n | `web/i18n/` | 23 种语言 |

## CONVENTIONS

### 文档
- **All generated docs go under `docs/`**: Training materials, PPTs, design docs, specs, and other generated documentation must be placed in `docs/` or its subdirectories (e.g., `docs/pptx/`, `docs/superpowers/specs/`). Never generate documentation files in the project root.

### Python (Backend)
- **Ruff**: 120 char lines, double quotes, strict rules (no print, no exec, no eval, no pickle)
- **Type checkers**: basedpyright + pyrefly + mypy (triple type checking!)
- **Pydantic v2**: `ConfigDict(extra="forbid")` by default
- **DDD**: Controller → Service → Core/Domain layered architecture
- **Tenant-scoped**: Always filter by `tenant_id`
- **File cap**: ~800 lines max
- **Package manager**: `uv` with `--project api` flag

### TypeScript (Frontend)
- **Strict TypeScript**: `no-explicit-any: error`
- **type over interface**: For type definitions
- **Tailwind**: Enforced via ESLint (consistent class order, no duplicates)
- **Icons via Tailwind**: `i-*` classes, not raw JSX
- **No direct `next` imports**: Must use `@/next`
- **Overlay migration**: Use `@/app/components/base/ui/*` primitives (not legacy)
- **i18n**: Keys must be flat, sorted, without extra/placeholder inconsistencies
- **Package manager**: `pnpm` (only-allowed)

### Build/CI
- **Docker Compose**: Auto-generated from template (`docker/docker-compose-template.yaml`)
- **CI**: 22 GitHub Actions workflows (API tests, Web tests, VDB tests, style checks)
- **Anti-slop**: AI code quality checks via `peakoss/anti-slop`
- **i18n**: LLM-driven translation via Claude Code Action

## ANTI-PATTERNS (THIS PROJECT)

| Pattern | Why Forbidden |
|---------|---------------|
| Editing `docker-compose.yaml` directly | Auto-generated, edit template + run generator |
| Circular imports | Use lazy imports (acknowledged anti-pattern) |
| Files >800 lines | Split into modules |
| `.codegraph/` in .gitignore | IDE indexing artifact committed to repo |
| Multiple AI agent configs | `.agents/`, `.claude/`, `.gemini/` all exist |

**Backend-specific**: See `api/AGENTS.md`
**Frontend-specific**: See `web/AGENTS.md`
**Docker-specific**: See `docker/AGENTS.md`

## COMMANDS

```bash
# Backend
uv run --project api pytest                    # Run tests
uv run --project api ruff format .             # Format
uv run --project api ruff check --fix .        # Lint
uv run --project api basedpyright .            # Type check
make lint                                      # All linters
make type-check                                # All type checkers
make test                                      # All tests

# Frontend
pnpm install                                   # Install deps
pnpm dev                                       # Dev server
pnpm lint:fix                                  # Lint + fix
pnpm type-check                                # Type check
pnpm test                                      # Run tests

# Docker
docker compose up -d                           # Start all services
docker/generate_docker_compose                 # Regenerate compose

# Dev scripts
dev/setup                                      # Full dev setup
dev/start-api                                  # Start backend
dev/start-web                                  # Start frontend
dev/start-worker                               # Start Celery worker
dev/start-beat                                 # Start Celery beat
```

## LOCAL DEV ENVIRONMENT

### Quick Start

```bash
dev/start-dev-env                    # 启动完整调试环境
dev/start-dev-env --skip-middleware  # 跳过中间件（已运行时）
dev/start-dev-env --skip-deps        # 跳过依赖安装
dev/status-dev-env                   # 查看服务状态
dev/stop-dev-env                     # 停止应用（保留中间件）
dev/stop-dev-env --include-middleware # 完全停止
```

### Architecture

1. **Middleware (podman/docker)**: PostgreSQL, Redis, Weaviate, Sandbox, Plugin Daemon, SSRF Proxy
2. **Backend (Python)**: Flask API :5001, Celery Worker, Celery Beat
3. **Frontend (Node.js)**: vinext :3000 (省资源模式)

### Log Files

| Service | Log File |
|---------|----------|
| API | `/tmp/dify-api.log` |
| Worker | `/tmp/dify-worker.log` |
| Beat | `/tmp/dify-beat.log` |
| Frontend | `/tmp/dify-web.log` |

### Podman Compatibility

使用 podman socket 兼容 docker compose:

```bash
systemctl --user start podman.socket
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
```

### Memory Optimization

前端使用 vinext (Vite+) 而非 Next.js dev:

- `NODE_OPTIONS="--max-old-space-size=2048"`
- 原生 ESM，无全量打包，内存占用显著降低
- 启动更快，HMR 更轻量

### Manual Startup (without scripts)

```bash
# 1. 初始化环境
cp api/.env.example api/.env
cp web/.env.example web/.env.local
cp docker/middleware.env.example docker/middleware.env

# 2. 安装依赖
cd api && uv sync --group dev
cd web && pnpm install

# 3. 启动中间件
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
docker compose -f docker/docker-compose.middleware.yaml --env-file docker/middleware.env up -d

# 4. 启动后端 (各终端)
cd api && uv run flask db upgrade
cd api && setsid uv run flask run --host 0.0.0.0 --port=5001 --debug > /tmp/dify-api.log 2>&1 < /dev/null &
cd api && setsid uv run celery -A celery_entrypoint.celery worker -P gevent -c 1 --loglevel INFO > /tmp/dify-worker.log 2>&1 < /dev/null &
cd api && setsid uv run celery -A celery_entrypoint.celery beat --loglevel INFO > /tmp/dify-beat.log 2>&1 < /dev/null &

# 5. 启动前端
cd web && NODE_OPTIONS="--max-old-space-size=2048" setsid pnpm dev:vinext > /tmp/dify-web.log 2>&1 < /dev/null &
```

## NOTES

- **Docker Compose is auto-generated**: Never edit `docker/docker-compose.yaml` directly. Edit `docker-compose-template.yaml` + `.env.example`, then run `docker/generate_docker_compose`.
- **Integration tests are CI-only**: Don't expect to run them locally (need Docker middleware).
- **`.codegraph/` is checked in**: IDE indexing artifact committed to repo.
- **Multiple AI agent configs**: `.agents/`, `.claude/`, `.gemini/` all exist.
- **`context/` vs `contexts/`**: Two directories with similar names in `api/` — confusing.
- **`next/` wrapper**: Non-standard indirection around Next.js imports in `web/`.
- **Core domain is monolithic**: 40 subdirectories in `api/core/` for separate bounded contexts.
- **Enums scattered**: Across `api/enums/`, `api/models/enums.py`, `api/core/entities/`.
- **`fields/` is framework leak**: Flask-RESTx serialization coupled to domain layer.
- **GitHub 访问**: 失败时使用 gh-proxy 重试（https://gh-proxy.com/）
