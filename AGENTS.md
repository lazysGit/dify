# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-04
**Commit:** Latest
**Branch:** main

## OVERVIEW

Dify is an open-source LLM app development platform combining AI workflows, RAG pipelines, agent capabilities, and model management. Monorepo with Python Flask backend (DDD) and Next.js frontend.

## STRUCTURE

```
dify/
├── api/            # Python Flask backend (DDD: controllers → services → core → models)
├── web/            # Next.js App Router frontend (TypeScript, React)
├── docker/         # Docker Compose deployment (auto-generated!)
├── sdks/           # Client SDKs (nodejs-client, php-client)
├── dev/            # Development shell scripts
├── scripts/        # Misc scripts (stress-test)
├── docs/           # Translated READMEs (23 languages)
├── images/         # Marketing images
├── .github/        # CI/CD (22 workflows)
├── .agents/        # AI agent configs
├── .claude/        # Claude-specific config
├── .gemini/        # Gemini-specific config
├── .omo/           # OpenCode config
└── .codegraph/     # Index artifact (checked in!)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Backend API | `api/` | Flask + DDD, read `api/AGENTS.md` |
| Frontend UI | `web/` | Next.js App Router, read `web/AGENTS.md` |
| Docker deployment | `docker/` | Auto-generated compose, read `docker/AGENTS.md` |
| SDK development | `sdks/` | Node.js + PHP clients, read `sdks/AGENTS.md` |
| Dev scripts | `dev/` | Shell scripts for local development |
| CI/CD | `.github/workflows/` | 22 GitHub Actions workflows |
| Configuration | `api/configs/`, `web/env.ts` | Pydantic settings (backend), t3/env (frontend) |
| Database migrations | `api/migrations/` | Alembic/Flask-Migrate |
| Async tasks | `api/tasks/`, `api/schedule/` | Celery tasks + beat schedules |
| Frontend components | `web/app/components/` | 108 base components, workflow canvas |
| i18n | `web/i18n/` | 23 languages |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `create_app()` | Factory | `api/app_factory.py` | Flask app creation + 20 extensions |
| `DifyApp` | Class | `api/dify_app.py` | Custom Flask subclass |
| `dify_config` | Singleton | `api/configs/__init__.py` | Pydantic settings (all env vars) |
| `celery` | Instance | `api/extensions/ext_celery.py` | Celery app (broker: Redis) |
| `ext_blueprints` | Module | `api/extensions/ext_blueprints.py` | 7 Flask blueprints registration |
| Root Layout | Component | `web/app/layout.tsx` | Providers: Jotai, themes, query, i18n |
| `env.ts` | Config | `web/env.ts` | Frontend env validation (t3/env) |
| `contract/` | Module | `web/contract/` | API contracts (console + marketplace) |
| `service/` | Module | `web/service/` | API service layer (55 composables) |

## CONVENTIONS

### Documentation
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
| Multiple AI agent configs | `.agents/`, `.claude/`, `.gemini/`, `.omo/` all exist |

**Backend-specific**: See `api/AGENTS.md`
**Frontend-specific**: See `web/AGENTS.md`
**Docker-specific**: See `docker/AGENTS.md`

## UNIQUE STYLES

1. **Triple type checking**: basedpyright + pyrefly + mypy (unprecedented strictness)
2. **Auto-generated Docker Compose**: Template → generator → production compose
3. **LLM-driven i18n**: Claude Code Action translates en-US JSON to 23 languages
4. **Anti-slop CI**: AI code quality checks in PR workflow
5. **Vite+ build system**: vite/vitest aliased to @voidzero-dev packages
6. **Single Docker image, 3 processes**: API image serves api/worker/beat via MODE env var
7. **20+ vector databases**: Supported via docker-compose + env vars
8. **680+ environment variables**: Massive configuration surface area

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

## NOTES

- **Docker Compose is auto-generated**: Never edit `docker/docker-compose.yaml` directly. Edit `docker-compose-template.yaml` + `.env.example`, then run `docker/generate_docker_compose`.
- **Integration tests are CI-only**: Don't expect to run them locally (need Docker middleware).
- **`.codegraph/` is checked in**: IDE indexing artifact committed to repo.
- **Multiple AI agent configs**: `.agents/`, `.claude/`, `.gemini/`, `.omo/` all exist.
- **`context/` vs `contexts/`**: Two directories with similar names in `api/` — confusing.
- **`next/` wrapper**: Non-standard indirection around Next.js imports in `web/`.
- **Core domain is monolithic**: 40 subdirectories in `api/core/` for separate bounded contexts.
- **Enums scattered**: Across `api/enums/`, `api/models/enums.py`, `api/core/entities/`.
- **`fields/` is framework leak**: Flask-RESTx serialization coupled to domain layer.
