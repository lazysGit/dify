# 模型权限控制与发布审批 — 分批执行进度

> 配套主计划：`docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md`
> 用途：主计划体量过大（13 个 Task），单次会话 token 不足以完成，拆为 8 个批次。本文件是跨会话衔接的唯一状态源：每批结束后必须更新本文件，每批开始前必须阅读本文件。
>
> **状态（2026-09-04）：批次 1-8 全部完成。** 13 个 Task 全部 commit 且 checkbox 已勾选；仅剩 Task 13 手动冒烟 8 条场景待用户在本地 dev 环境执行确认。

---

## 执行规则

1. 每批使用 `superpowers:executing-plans` skill 顺序执行，严格按主计划对应 Task 的步骤（TDD：先写失败测试再实现）。
2. 每批结束三件事：对应测试全部通过；按计划逐 Task commit（conventional commits）；更新本文件的批次表与运行时记录。
3. 后端任务 commit 前对 touched 文件跑 `uv run --project api ruff check --fix`（主计划 U6 约束，不只 Task 5）。
4. 主计划中的 `- [ ]` checkbox 属于对应批次，完成即勾选主计划原文。
5. token 兜底：批内上下文不足时，把已完成且测试通过的部分先 commit，剩余 Task/Step 记入下方"运行时记录 - 未完成事项"，并入下一批执行，不得留下未 commit 的半成品。
6. 批次依赖：批次 1 -> 2 -> 3 -> 6 -> 7；批次 4 -> 5；批次 8 依赖 5 与 7。批次 4-5（Feature 2 后端）与批次 1-3（Feature 1 后端）完全独立，可乱序执行。
7. 测试命令速记：
   - 后端：`uv run --project api pytest <测试文件> -v`
   - 前端：`cd web && pnpm test -- <名称>`、`pnpm type-check`、`pnpm lint`

---

## 批次总览

| 批次 | 主计划 Tasks | 内容 | 依赖 | 状态 | Commits |
|------|-------------|------|------|------|---------|
| 1 | Task 1-2 | 数据库层：`AccountModelWhitelist` 模型 + Alembic 迁移 | 无 | 已完成 | df9abf955c, 519031ed91 |
| 2 | Task 3 | F1 核心：`ModelPermissionService` + 错误类型（14 测试用例） | 批次 1 | 已完成 | eb23028dfb |
| 3 | Task 4-6 | F1 API 层：管理白名单 API、我的可用模型 API、选择器单点过滤 | 批次 2 | 已完成 | 228b0c6f18, c14ff8431d, c7187709eb |
| 4 | Task 7 | F2 门控：`AppPublishService` 发布权限检查 + 审计（11 用例矩阵） | 无 | 已完成 | 3ceb4844ec |
| 5 | Task 8 | F2 API：可发布部门列表 `publishable-departments` | 批次 4 | 已完成 | 044d52420f |
| 6 | Task 9 + Task 11 | F1 前端：oRPC 契约/Hook + "我的可用模型"只读页 | 批次 3 | 已完成 | 703fe0c6f6, 66ce35b9a9 |
| 7 | Task 10 | F1 前端：成员页"模型权限"入口与白名单对话框（最重 UI） | 批次 6 | 已完成 | c936eb1c75 |
| 8 | Task 12 + Task 13 | F2 前端：发布对话框角色限制 + 全量回归与冒烟 | 批次 5, 7 | 已完成（手动冒烟待用户） | 3d022fb2dc, add21bc913 |

说明：Task 10 与 Task 11 均只依赖 Task 9 的 Hook，互不依赖，故轻量的 Task 11 与 Task 9 合并为批次 6，Task 10 单独成批。

---

## 运行时记录（跨批次传递，随批次推进填写）

### 已验证事实（摘自主计划，执行时无需重复 grep）

- 批次 6 提示：publishable-departments 响应结构为 `{departments: [{id, name(祖先链 " > " 拼接), is_own_department}], publish_scope, can_publish_cross_department}`；publish_scope 三值 all / department_and_subdepartments / own_department_only
- 批次 8 提示：测试中模拟已登录用户不要 patch `libs.login.current_user`（LocalProxy 会穿透 mock），改在 `app.test_request_context` 内设 `g._login_user = account`

- 批次 3 提示：service 方法内 `ModelProviderService()` 实例化后才调用，controller 单测 patch `services.model_permission_service.ModelProviderService` 后用 `.return_value` 配置；`Account` 注解依赖模块级 `from __future__ import annotations` + `TYPE_CHECKING` import，新 controller 无需此技巧（Account 为运行时实际参数）
- 批次 6 提示：拍平 dict 的 label 取 `I18nObject.en_US`（`_label_text` helper），前端展示直接用该字符串
- 批次 7 提示：GET 白名单响应自带 `all_system_models`（SystemModelEntry[]，含 provider/model/model_type/label），白名单对话框的模型数据源无需额外列表 API，直接复用 `useMemberModelWhitelist`
- 批次 7 提示：`react/set-state-in-effect` 规则禁止 effect 内同步 setState——选中集用"派生状态"模式（`overrideKeys ?? 从 data 派生`），交互后写入 overrideKeys，无 effect 无 render setState
- 批次 7 提示：成员行按钮与表头列共用 i18n 文本，RTL 测试点击需用 `getAllByRole('button', { name: key })` 定位（getAllByText 会命中表头 div）
- 批次 8 提示：后端 `publishable-departments` 返回的 `departments` 是**过滤后的可发布集合**（非全量+标记），前端限制逻辑用"tree 节点 id 不在集合内则 disabled"实现；数据未加载时不限制（后端保存时兜底 403）
- 批次 8 修复清单（全在 `add21bc913`）：`get_app_model`/`edit_permission_required` 装饰器顺序按 `statistic.py` 先例调整（publish_department.py 3 处）；`model_permission_service.get_filtered_models` 过滤键误用 `model.provider.provider`（ProviderModel 无 provider 字段）改为 `response.provider`；`is_non_owner_role` 签名改 `str`（StrEnum 成员与 str 比较等价）；`model_permission.py` result 显式初始化规避 abort 无类型标注导致的 possibly-unbound；`app_publish_service` 部门管理员分支加 `user_dept_id` 非空 guard；`dataset_service.get_datasets` 部门过滤加 `tenant_id` 窄化；`__init__.py`/`models/__init__.py` 导出补 __all__
- 前端全量 `pnpm test`：27727 passed / 111 failed + 2 unhandled——111 failed 为分支早期 commit `15d4b8aa94`（department filter tabs）给 CreateAppModal 等组件引入 `useDepartmentList` 调用，旧 spec 无 QueryClientProvider 包装所致，与本功能无关（失败集中 explore/create-app-modal、datasets/list、apps list 等 7 文件）；2 unhandled 为 refresh-token 401 预存网络 mock 问题。属分支遗留 spec 基建债，未在本项目内修复
- `web/app/signin/modern-login.tsx` 与 `web/app/signin/modern/`（预存未跟踪）已按用户指示删除，`web/eslint-suppressions.json` 已 prune（`--prune-suppressions` 移除 14 行失效条目）。此后 web 侧 commit 无需再走"移出/移回"流程

### 代码评审修复（55ff64f57e，评审范围 f6927600dc..add21bc913）

- Critical：`get_whitelist`/`is_restricted`/`set_whitelist` 删除语句补 `tenant_id` 过滤（账号可入多租户，原实现会把 A 租户的白名单泄漏到 B 租户）；白名单 GET/PUT 控制器补 `_ensure_tenant_member`（`TenantAccountJoin` 查询，非本租户成员 404），堵住跨租户 IDOR
- Important：service 测试实体工厂从 `ModelWithProviderEntity` 改为真实链路的 `ProviderModelWithStatusEntity`（SYSTEM_MODELS 改 `(provider, entity)` 元组，provider 归属外层 response）——这正是 provider-key bug 当初漏测的根因；补 tenant 作用域断言 3 例 + 去重回归 1 例 + 控制器 404 用例
- Important：成功审计日志移到 `db.session.commit()` 之后（原顺序会在发布落库失败时残留"成功"审计，与同文件既有日志顺序矛盾）
- Important：白名单对话框未修改时禁用保存（防"顺手保存"把不限制静默变成显式全量白名单）；`mutateAsync` 失败捕获并 toast 报错；标题显示成员名（`model_whitelist.member_title`）；`set_whitelist` 对重复 triple 去重（防 unique 约束 IntegrityError 500）
- Minor 顺手修：删除未引用的 `my_available_models.loading` i18n key
- 未修复（已记录待后续）：白名单对话框未显示成员归属租户语义不变；`publish_scope` 用 `len(accessible)>1` 启发式判定（无子部门管理员标签失真，集合本身正确）；每次 PUT 发布均写审计（无 diff 跳过可优化）；`department_ids` 不校验存在性（既有缺口）

- 模型服务真实类名为 `ModelProviderService`（`api/services/model_provider_service.py:23`），非设计文档所写 `ProviderModelService`；按类型取模型走 `get_models_by_model_type(tenant_id, model_type) -> list[ProviderWithModelsResponse]`（:385）
- 选择器过滤唯一端点：`ModelProviderAvailableModelApi.get`（`api/controllers/console/workspace/models.py:527`），前端唯一入口 `useModelListByType`（`web/service/use-common.ts:265`）
- 发布门控目标方法为 `AppPublishService.update_published_departments`（`api/services/app_publish_service.py:35`，设计文档写的 `update_publish_departments` 有误），签名已含 `user/tenant_id/app_id/operator_ip`，无需改签名
- `controllers/console/account/` 目录当前不存在，Task 5 需新建目录 + `__init__.py`
- 不实现独立 Repository 层，Service 直接用 `db.session.query()`（先例 `DepartmentService`）
- 审计日志统一走 `DepartmentAuditLog.log(tenant_id, operator_id, operator_ip, action, content)`

### 待填写

- 批次 1 开始时：运行 `uv run --project api flask db heads`，将当前 head revision 记录于此：`b3e5f7a9c1d2`（批次 1 已确认）
- 批次 1 结束时：新迁移的 revision id 记录于此：`c7d8e9f0a1b3`（文件 `2026_09_03_1000-c7d8e9f0a1b3_add_account_model_whitelist.py`，已在本地 dev 库真实执行 upgrade 成功）

### 偏离计划的决策

- Task 7 实现优化：`_check_publish_permission` 中 admin 判断提前到 `get_user_department_id` 之前（计划样例先查部门再判 admin，会令 admin 路径触达数据库）；成功审计的 admin 分支同样短路。语义与计划矩阵一致。
- Task 7 既有 diff/审计用例（test_full_replace_diff 等 4 个）的用户从普通成员改为 admin，并放宽 publish_app_to_departments 断言为 any()：新增的门控与 publish_cross/own_department 审计叠加后，普通成员不再能直达 diff 逻辑。
- Task 4 GET 响应中 `whitelist` 项的 key 以控制器样例代码为准（`provider_name`/`model_name`/`model_type`），与计划 GET 响应 JSON 示例（写的是 `provider`）不一致。批次 6 的前端契约按实际实现（`provider_name`）编写。
- Task 6 回归适配：`test_models.py` 的 `test_available_models`/`test_no_models` 改为 mock `ModelPermissionService.get_filtered_models`（staticmethod，类级调用，mock 时勿用 `.return_value` 中转）。
- `flask db check` 当前不可用（报 "New upgrade operations detected"），原因是 `workflow_draft_variables` 表的既有 schema 漂移（索引 `workflow_draft_variables_app_id_user_id_key` vs 唯一约束命名差异），与本功能无关，勿在本项目内修复。迁移链验证以 `flask db heads` 为准。
- 本地 dev 库已 `flask db upgrade` 至 `c7d8e9f0a1b3`（批次 1 顺带完成，Task 13 冒烟直接可用）。
- api 目录内运行命令时省略 `--project api`（workdir 已在 api 内，重复指定会报 "Project directory `api` does not exist"）。

### 未完成事项（token 兜底顺延）

- （无）

### 环境备注（已完成，归档备查）

- 工作区预存未跟踪文件 `web/app/signin/modern-login.tsx` 与 `web/app/signin/modern/` 曾使 pre-commit type-check 失败，批次 6-8 期间采用"临时移到 `/tmp/opencode/signin-stash/`、commit 后移回"方案；批次 8 经用户确认后已直接删除（连同 stash 目录），eslint suppressions 同步 prune。

---

## 各批次启动 Prompt（复制到新会话即用）

### 批次 1

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Milestone 1（Task 1 与 Task 2），以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md 的"执行规则"与"运行时记录"。仅执行批次 1：先运行 `uv run --project api flask db heads` 并把 head 记入进度文件"待填写"处，再按 TDD 完成 Task 1-2，完成每个 Task 即 commit，最后更新进度文件（批次状态、迁移 revision、勾选主计划 checkbox）。

### 批次 2

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 3 一节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 2（Task 3：ModelPermissionService 核心），严格按计划列出的 14 个测试用例 TDD 实现，commit 前对 touched 文件跑 `uv run --project api ruff check --fix`，完成后更新进度文件并勾选主计划 checkbox。

### 批次 3

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 4、Task 5、Task 6 三节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 3（三个后端 API），按 Task 顺序逐个 TDD 实现并各自 commit，Task 6 结束需跑既有 models 端点回归（计划内命令），每个 Task 后更新进度文件。

### 批次 4

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 7 一节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 4（发布权限检查 + 审计日志），按计划的 11 个权限矩阵用例 TDD 实现，注意权限检查代码插在 `enable_site` 校验之后、diff 计算之前，完成后更新进度文件。

### 批次 5

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 8 一节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 5（可发布部门列表 API），注意 `get_accessible_department_ids` 第一参数是 user 对象且三种返回值语义映射（None/[]/列表），完成后更新进度文件。

### 批次 6

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 9 与 Task 11 两节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 6（先 Task 9 oRPC 契约与 Hook，再 Task 11 只读页面；Task 10 留给批次 7，勿动成员页），前端每步跑 `pnpm type-check && pnpm lint`，完成后更新进度文件。

### 批次 7

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 10 一节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 7（成员页模型权限入口与白名单对话框），复用 `@/app/components/base/ui/*` 的 Dialog/Checkbox，不使用 deprecated 的 Confirm/ToastContext，i18n 只加 zh-Hans 与 en-US 平铺 key，完成后更新进度文件。

### 批次 8

> 使用 superpowers:executing-plans skill。阅读 docs/superpowers/plans/2026-09-03-model-permissions-and-publish-gate.md 中 Task 12 与 Task 13 两节，以及 docs/superpowers/plans/2026-09-03-model-permissions-progress.md。仅执行批次 8（发布对话框角色限制 + 全量回归），全量验证输出过大时重定向到 /tmp 下文件再用工具检索；手动冒烟清单（Task 13 的 8 条场景）属于人工验证，逐条列出待用户在本地 dev 环境执行，完成后更新进度文件。

---

## 完成判据

- 主计划 13 个 Task 全部 commit 且 checkbox 全勾选
- `make lint && make type-check && make test` 与前端 `pnpm type-check && pnpm lint && pnpm test` 全绿
- Task 13 手动冒烟 8 条场景经用户确认（含 3 条边界场景）
