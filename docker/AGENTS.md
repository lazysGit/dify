# DOCKER KNOWLEDGE BASE

**Generated:** 2026-07-04
**Stack:** Docker Compose + Nginx + PostgreSQL/MySQL + Redis + Vector DBs

## STRUCTURE

```
docker/
├── docker-compose.yaml           # Production compose (AUTO-GENERATED!)
├── docker-compose-template.yaml  # Template for generation (EDIT THIS!)
├── docker-compose.middleware.yaml # Dev middleware compose
├── .env.example                  # Environment template (680+ vars)
├── middleware.env.example        # Middleware env template
├── generate_docker_compose       # Generator script
├── dify-env-sync.sh              # Incremental .env sync tool
├── dify-env-sync.py              # Python .env sync tool
├── nginx/                        # Nginx config templates
├── certbot/                      # SSL certificate management
├── ssrf_proxy/                   # SSRF protection proxy (Squid)
├── volumes/                      # Data directories (committed!)
├── pgvector/                     # PGVector config
├── elasticsearch/                # ElasticSearch config
├── tidb/                         # TiDB config
├── couchbase-server/             # Couchbase config
├── iris/                         # IRIS config
├── startupscripts/               # DB startup scripts
├── docker-compose.png            # Architecture diagram
└── README.md                     # Docker documentation
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Change services | `docker-compose-template.yaml` | EDIT THIS, not docker-compose.yaml |
| Add env vars | `.env.example` | Add to template, then regenerate |
| Regenerate compose | `./generate_docker_compose` | Run after template changes |
| Sync .env | `./dify-env-sync.sh` | Incremental sync without overwrite |
| Nginx config | `nginx/` | Reverse proxy templates |
| SSL setup | `certbot/` | Let's Encrypt certificates |
| SSRF proxy | `ssrf_proxy/` | Squid proxy config |
| Vector DB config | `pgvector/`, `elasticsearch/`, etc. | Per-DB configuration |
| Middleware (dev) | `docker-compose.middleware.yaml` | PostgreSQL/MySQL + Redis + Weaviate |

## SERVICES

### Runtime Services (in docker-compose.yaml)

| Service | Image | Purpose |
|---------|-------|---------|
| `api` | `langgenius/dify-api` | Flask API server (gunicorn + gevent) |
| `worker` | `langgenius/dify-api` | Celery worker (same image, MODE=worker) |
| `worker_beat` | `langgenius/dify-api` | Celery beat (same image, MODE=beat) |
| `web` | `langgenius/dify-web` | Next.js standalone server |
| `nginx` | `nginx:latest` | Reverse proxy (ports 80/443) |
| `db_postgres` | `postgres:16` | PostgreSQL database |
| `db_mysql` | `mysql:8.0` | MySQL database (alternative) |
| `redis` | `redis:7-alpine` | Redis cache + Celery broker |
| `weaviate` | `semitechnologies/weaviate` | Vector database (default) |
| `sandbox` | `langgenius/dify-sandbox` | Code execution sandbox |
| `plugin_daemon` | `langgenius/dify-plugin-daemon` | Plugin execution |
| `ssrf_proxy` | `squid:latest` | SSRF protection proxy |

### Vector Database Options (20+)

Supported via docker-compose + env vars:
- Weaviate (default), Qdrant, Milvus, PGVector, Chroma, ElasticSearch
- MyScale, OceanBase, Couchbase, TiDB, Oracle, OpenSearch
- AnalyticDB, Tencent, Viking, Relyt, PolarDB, Tablestore
- GaussDB, LinDB, Azure AI Search, BryteType, Clarifai

### Storage Backends (20+)

Supported via env vars:
- Local (default), S3, Azure Blob, GCS, Alibaba Cloud OSS
- Tencent COS, Huawei OBS, Volcano TOS, Baidu OBS
- Supabase, OCI, Volcengine, KSCloud, Vertex AI

## CONVENTIONS

### Docker Compose
- **AUTO-GENERATED**: Never edit `docker-compose.yaml` directly!
- **Edit template**: Modify `docker-compose-template.yaml` + `.env.example`
- **Regenerate**: Run `./generate_docker_compose` after changes
- **Sync .env**: Use `./dify-env-sync.sh` for incremental updates

### Environment Variables
- **Massive surface**: 680+ variables in `.env.example`
- **Grouped by feature**: Database, Redis, Storage, Vector DB, Mail, etc.
- **Dual database**: PostgreSQL (default) or MySQL via `DB_TYPE`
- **Middleware env**: Separate `middleware.env.example` for dev

### Networking
- **Nginx reverse proxy**: Routes `/api` → api, `/` → web
- **SSRF protection**: Squid proxy for outbound requests
- **Sandbox isolation**: Separate container for code execution

### Volumes
- **Committed to repo**: `docker/volumes/` contains config files
- **Data persistence**: PostgreSQL, Redis, Weaviate data volumes
- **SSL certificates**: `certbot/` for Let's Encrypt

## ANTI-PATTERNS (THIS PROJECT)

| Pattern | Why Forbidden |
|---------|---------------|
| Editing `docker-compose.yaml` | Auto-generated, will be overwritten |
| Skipping `generate_docker_compose` | Template changes need regeneration |
| Hardcoding env values | Use `.env` files |
| Direct database access | Use API or admin tools |
| Running without middleware | Need PostgreSQL/MySQL + Redis |

## NOTES

- **Single API image, 3 processes**: `langgenius/dify-api` serves api/worker/beat via MODE env var
- **API image includes Node.js 22**: Unusual for Python API (used for plugins?)
- **Health checks with `required: false`**: Allows API to start before DB is ready
- **Squid SSRF proxy**: Security sandbox for outbound requests
- **Docker Hub only**: No ECR/GCR/GHCR, just `langgenius/dify-*`
- **`.env` sync tool**: Custom script for incremental env updates
- **Dual database support**: PostgreSQL (default) or MySQL via config
- **20+ vector databases**: Massive integration surface area
- **680+ environment variables**: Extreme configuration complexity

## QUICK REFERENCE

```bash
docker compose up -d                                    # Start all
docker compose -f docker-compose.middleware.yaml up -d  # Middleware only
./generate_docker_compose                               # Regenerate compose
./dify-env-sync.sh                                      # Sync .env
docker compose logs -f api                              # View API logs
docker compose down                                     # Stop all
```
