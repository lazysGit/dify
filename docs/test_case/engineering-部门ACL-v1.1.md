# 工程验收：部门访问控制

客户 UAT 见 [uat-部门ACL-v1.1.md](./uat-部门ACL-v1.1.md)。本文件给研发/测试，可查库、打 API、看日志。

编号 `ENG-xxx` 后括号为原文 `TC-DM-*`。

## 1. API

| 编号 | 目的 | 步骤 | 预期 |
|------|------|------|------|
| ENG-001 (TC-DM-050) | 未登录部门 API | 无 token：`GET /console/api/workspaces/current/departments` | 401 |
| ENG-002 (TC-DM-006/014) | 越权写操作 | 部门管理员或普通成员：`POST` 创建部门、`DELETE` 部门 | 403 |
| ENG-003 (TC-DM-029) | 部门管理员不能移范围外成员 | 技术部管理员移动产品部成员 | 403 |
| ENG-004 (TC-DM-076) | 部门管理员不能把应用建到范围外 | 创建应用 `department_id`=产品部 | 400/403，提示不在管辖范围 |
| ENG-005 (TC-DM-064) | 部门列表树 | `GET .../departments` | 200；含列表与 tree；节点含成员/应用/知识库计数 |
| ENG-006 (TC-DM-065) | 创建部门缺 name | `POST` body `{}` | 400，name 必填 |
| ENG-007 (TC-DM-066) | 创建成员响应 | 合法 POST 成员 | 201；含 id、name、email、department_id、role、is_department_admin |
| ENG-008 (TC-DM-067) | 删有成员部门 | `DELETE` 有成员的部门 | 400；文案含「请先移动成员」（无强制计数字段） |
| ENG-009 (TC-DM-049) | 默认部门下不能建子部门 | `POST` `parent_id`=默认部门 | 400，「默认部门不能有子部门」 |
| ENG-010 (TC-DM-099) | 已发布部门列表 | `GET /console/api/apps/{id}/publish-departments` | 200；部门含 id、name、path |
| ENG-011 (TC-DM-097) | 发布幂等 | 已发到技术部后再 PUT 同一列表 | 成功；该应用-部门不重复 |
| ENG-012 (TC-DM-094) | 发布全量替换 | 原技术部+产品部；改为产品部+运营部 | 技术部记录删除；运营部新增；产品部保留 |
| ENG-013 (TC-DM-110) | 聊天鉴权 verify | **GET** `/api/chat-access/verify?app_code={code}`，带控制台登录 cookie | 有权：200 且 `access=true`，含 app_info。无权：200 且 `access=false`（不是裸 403 页面）。ACL 关闭：404。缺登录：401 |
| ENG-014 (-) | editor 跨部门发布 | 普通 editor PUT 含其他部门 id | 整单失败；可有 `publish_permission_denied` 审计 |

## 2. 审计（查 operation_logs / DepartmentAuditLog）

有记录即可；字段以现网 content 为准，勿死锁旧文档字段名。未配邮件时不因无邮件判失败。

| 编号 | 操作 | 预期 action（或同类） |
|------|------|----------------------|
| ENG-015 (TC-DM-058) | 创建部门 | `create_department` |
| ENG-016 (TC-DM-059) | 移动成员 | `move_member`；content 含 member 与 **target_department_id**（不是 old/new 一对字段） |
| ENG-017 (TC-DM-060) | 转移应用 | `transfer_app` 或现网等价 action |
| ENG-018 (TC-DM-098) | 发布部门 | 按角色可能是 `publish_to_own_department` / `publish_cross_department` / `publish_app_to_departments` |

## 3. 数据与身份

| 编号 | 目的 | 步骤 | 预期 |
|------|------|------|------|
| ENG-019 (TC-DM-048) | 每租户仅一个默认部门 | 查 departments `is_default=true` | 每 tenant 一条 |
| ENG-020 (TC-DM-079) | 创建应用不传 department_id | 租户管理员 POST 不带部门 | 落到**操作者当前所属部门**；仅当操作者无部门时才默认部门 |
| ENG-021 (TC-DM-108) | 运行页发消息的身份 | 已登录有权用户在 `/chat/{code}` 发一条 | `messages.from_account_id` 可为 NULL；存在 **非匿名** EndUser，`session_id` 形如 `console:{account_id}`。不要按「不创建 EndUser」验收 |
| ENG-022 (TC-DM-056) | 并发删同一空部门 | 两会话几乎同时 DELETE | 最终部门不存在；至多一次成功，另一次 404 或校验错误即可，**不要求 409** |
| ENG-023 (TC-DM-057) | 并发移动同一人 | 两人同时移到不同部门 | 最终只属一个部门；失败者任意冲突/过期错误即可 |

## 4. 迁移（一次性 / 升级）

在测试库执行，勿对生产直接试。

| 编号 | 目的 | 预期 |
|------|------|------|
| ENG-024 (TC-DM-061) | 无部门用户 | `tenant_account_joins.department_id` 空值补到该租户默认部门 |
| ENG-025 (TC-DM-062) | 无部门应用 | `apps.department_id` 同样回填 |
| ENG-026 (TC-DM-063) | 无部门知识库 | `datasets.department_id` 同样回填 |
| ENG-027 (TC-DM-114) | 已开站点应用自动发布到所属部门 | `app_published_departments` 插入所属部门；`ON CONFLICT` 不重复 |
| ENG-028 (TC-DM-080,115) | 迁移后行为 | 原用户探索与常用运行链接与迁移前一致（与 UAT 探索/聊天交叉验证） |

## 5. 明确不做客户验收的原文条目

| 原文 | 处理 |
|------|------|
| TC-DM-005（在第 9 级下创建期望失败） | 错误；UAT-005 已改正 |
| TC-DM-032（normal 不能当部门管理员） | 错误；UAT-032 已改正 |
| TC-DM-051（成员列表含子部门） | 错误；UAT-052 已改正 |
| TC-DM-054/055 自动清管理员 | 现网未实现；UAT-036 降级记录 |
| TC-DM-071 无部门空态 | 与默认部门矛盾，删除 |
| TC-DM-090 普通 editor 发多部门 | 错误；拆成 UAT-067/068 |
| TC-DM-101 写死 `:8010` | 删除 |
| TC-DM-110 POST verify | 改为 ENG-013 GET |
