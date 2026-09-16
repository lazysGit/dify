# NBYS 生产薄镜像构建与部署

基于官方 `langgenius/dify-api:1.13.3` / `langgenius/dify-web:1.13.3`，叠本分支源码后打成 `dify-*:${IMAGE_TAG}`（默认 `1.13.3-nbys`）。

**唯一环境配置（编排）**：[`docker/.env.nbys`](../../docker/.env.nbys)  
**前端薄构建 env**：[`web/.env.nbys`](../../web/.env.nbys)（同域 `/console/api`、`/api`，勿用 `web/.env.local`）  
**Compose 覆盖（可提交）**：[`docker/docker-compose.nbys.yaml`](../../docker/docker-compose.nbys.yaml)  
**薄 Dockerfile**：[`api/Dockerfile.nbys`](../../api/Dockerfile.nbys)、[`web/Dockerfile.nbys`](../../web/Dockerfile.nbys)

不要用全量 [`api/Dockerfile`](../../api/Dockerfile) / [`web/Dockerfile`](../../web/Dockerfile) 做 NBYS 生产构建（慢：NodeSource / nltk / 全量 apt）。  
不要使用 gitignored 的 `docker-compose.override.yaml`。

**项目组固定为 `dify`**：所有容器、网络都挂在 Compose 项目 `dify` 下（例如 `dify-api-1`、`dify-web-1`、`dify-db_postgres-1`）。命令必须带 `-p dify`，compose 文件里也有 `name: dify`。

下文完整 compose 命令：

```bash
# 必须在 docker/ 目录下执行
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml <子命令>
```

---

## 前置

- 已 checkout 含部门 ACL / 嵌入凭证的分支
- Docker 或 rootless Podman（Podman 需 `systemctl --user start podman.socket`，并 `export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock`）
- Node.js + pnpm（编 web）；建议 Node 22
- 首次上线前编辑 `.env.nbys`：把带 `# TODO(nbys): 上线前手动替换` 的密钥换成随机值（须在第一次写入 `VOLUMES_ROOT` 之前）

关键变量（已在 `.env.nbys`）：

| 变量 | 含义 |
|------|------|
| `COMPOSE_PROJECT_NAME` | Compose 项目组，固定 `dify` |
| `IMAGE_TAG` | 自建镜像标签，默认 `1.13.3-nbys` |
| `VOLUMES_ROOT` | 数据根目录，生产为 `/data/dify_data` |
| `UV_DEFAULT_INDEX` / `PIP_MIRROR_URL` | 阿里云 PyPI |
| `DEPARTMENT_ACCESS_CONTROL_ENABLED` | `true` |

对外暂无域名时 URL 留空，走 Nginx 同域。

---

## 启动全部服务占用的端口

默认 profile：`weaviate` + `postgresql`（见 `.env.nbys` 的 `COMPOSE_PROFILES`）。

### 映射到宿主机的端口（必须检查是否空闲）

| 宿主机端口（`.env.nbys`） | 容器 | 用途 |
|---|---|---|
| `EXPOSE_NGINX_PORT`（默认 80） | nginx:80 | 对外 HTTP（控制台 / 嵌入） |
| `EXPOSE_NGINX_SSL_PORT`（默认 443） | nginx:443 | 对外 HTTPS |
| `EXPOSE_PLUGIN_DEBUGGING_PORT`（默认 5003） | plugin_daemon:5003 | 插件远程调试（可改；生产可换高端口） |

说明：

- api(5001)、web(3000)、Postgres(5432)、Redis(6379)、Weaviate(8080)、sandbox(8194)、SSRF(3128)、plugin_daemon(5002) **只在 Compose 内网互通，默认不占用宿主机端口**。
- rootless Podman **不能绑 80/443**（未提权时）：请把 `EXPOSE_NGINX_*` 改成 `>=1024`（如 18080 / 18443）。
- `EXPOSE_PLUGIN_DAEMON_PORT` 在环境变量里存在，但默认 compose **没有**把它 publish 到宿主机；真正 publish 的是调试口 `EXPOSE_PLUGIN_DEBUGGING_PORT`。

### 构建/启动前端口检查

```bash
cd docker
./check-nbys-ports.sh
# 若有 [BUSY]，自动改写成空闲端口并写回 .env.nbys：
./check-nbys-ports.sh --fix
./check-nbys-ports.sh   # 再确认全是 [FREE]
```

手动改端口时编辑 `.env.nbys`：

```bash
EXPOSE_NGINX_PORT=18080
EXPOSE_NGINX_SSL_PORT=18443
EXPOSE_PLUGIN_DEBUGGING_PORT=15003
```

改完后访问地址变为 `http://<主机>:${EXPOSE_NGINX_PORT}/install`。

---

## 标准构建与启动

在仓库根目录执行：

```bash
# Podman 时取消下一行注释
# export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"

# 0) 端口检查（被占用则 --fix 写回 .env.nbys）
cd docker
./check-nbys-ports.sh || ./check-nbys-ports.sh --fix
cd ..

# 1) 宿主机编前端（薄 web 镜像只 COPY 产物）
# 使用 web/.env.nbys：同域相对前缀。不要直接用 .env.local（会打进 localhost:5001）。
# .env.production.local 在 next build 时优先级高于 .env.local，建完即删。
cd web
pnpm config set registry https://registry.npmmirror.com
pnpm install --frozen-lockfile
cp .env.nbys .env.production.local
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
rm -f .env.production.local
cd ..

# 2) 拉官方底座（有本地缓存可跳过）
docker pull langgenius/dify-api:1.13.3
docker pull langgenius/dify-web:1.13.3

# 3) 薄构建 api + web（-p dify 归入同一组）
cd docker
export COMMIT_SHA=$(git -C .. rev-parse --short HEAD)
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml build api web
```

---

## 构建后如何启动

构建只产出镜像 `dify-api:${IMAGE_TAG}` 与 `dify-web:${IMAGE_TAG}`，**不会自动跑容器**。启动前再跑一次端口检查，然后 `up -d`：

```bash
cd docker
./check-nbys-ports.sh || ./check-nbys-ports.sh --fix

# 数据目录（VOLUMES_ROOT=/data/dify_data）；rootless Podman 注意 uid 映射
sudo mkdir -p \
  /data/dify_data/db/data \
  /data/dify_data/redis/data \
  /data/dify_data/weaviate \
  /data/dify_data/app/storage \
  /data/dify_data/plugin_daemon \
  /data/dify_data/sandbox/dependencies \
  /data/dify_data/sandbox/conf
# sandbox 需要 conf/config.yaml；可从仓库示例复制（首次，在 docker/ 目录下）
cp -n volumes/sandbox/conf/config.yaml* "${VOLUMES_ROOT:-/data/dify_data}/sandbox/conf/" 2>/dev/null || true
touch "${VOLUMES_ROOT:-/data/dify_data}/sandbox/dependencies/python-requirements.txt"

docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml up -d
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml ps
```

勿 `docker compose down -v`。首次打开：`http://<主机>:${EXPOSE_NGINX_PORT:-80}/install`。

只重启已有容器、不重建镜像：

```bash
cd docker
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml up -d
```

---

## 升级同一套环境

```bash
git pull
cd web
pnpm install --frozen-lockfile
cp .env.nbys .env.production.local
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
rm -f .env.production.local
cd ..
cd docker
export COMMIT_SHA=$(git -C .. rev-parse --short HEAD)
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml build api web
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml up -d
```

- api：`uv.lock` 未变时 `uv sync` 走 Docker 层缓存，通常很快；lock 变了只重装差量。
- 不要对自定义 api/web 跑无过滤的 `docker compose pull`；中间件可按服务名单独 pull。
- `SECRET_KEY` / 库密码与首次写入 volume 时保持一致。

---

## 镜像内有什么

| 镜像 | 内容 |
|------|------|
| `dify-api:${IMAGE_TAG}` | 官方运行时（含 `.venv` 底座、nltk/tiktoken）+ 本分支 api 源码 + `uv sync`；同一镜像跑 api / worker / worker_beat |
| `dify-web:${IMAGE_TAG}` | 官方 web 运行时 + 本机 `pnpm build` 的 standalone / static / public |
| 其它 compose 服务 | 仍拉官方 Hub 镜像（Postgres、Redis、Weaviate、sandbox、plugin_daemon、nginx 等） |

向量库 **不在** api/web 镜像内，默认独立 `weaviate`，数据在 `/data/dify_data/weaviate`。

---

## 校验清单

```bash
cd docker
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml ps
docker compose -p dify --env-file .env.nbys -f docker-compose.yaml -f docker-compose.nbys.yaml logs api --tail 50
docker images | grep '1.13.3-nbys'
docker run --rm --entrypoint bash dify-api:1.13.3-nbys -lc \
  'ls migrations/versions/*embed_jti* && test -f services/embed_token_service.py && echo ok'
```

ACL 开启时：控制台嵌入弹窗复制的 iframe 应含 `/chatbot/{code}?embed_token=`。

---

## 禁止事项

- 把仓库 `api/`、`web/` 整树 bind mount 进生产容器（会盖掉 `.venv` / standalone）。
- `docker compose down -v` 或删除 `VOLUMES_ROOT` 后指望数据还在。
- 库已初始化后再改 `SECRET_KEY` / `DB_PASSWORD` / `WEAVIATE_API_KEY`（会登不上或对不上旧数据）。
- 用未 `pnpm build` 的 web 目录直接 `compose build web`（薄 Dockerfile 需要 `.next/standalone`）。
- 带着开发用 `web/.env.local`（`localhost:5001`）打生产 web 包（会把错误 API 前缀打进 standalone；请用 `web/.env.nbys` → `.env.production.local`）。
- 漏掉 `-f docker-compose.nbys.yaml`（会仍用 Hub 官方 `langgenius/dify-*:1.13.3`，不含本分支）。
- 漏掉 `-p dify` / 不用 `name: dify`（容器会落到别的 Compose 项目组，和现网栈对不上）。
