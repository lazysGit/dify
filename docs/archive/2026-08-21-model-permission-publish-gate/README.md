# 备份说明（2026-08-21）

本目录存放被统一设计替换前的三份旧稿（原位于 `docs/dm/`）：

| 文件 | 说明 |
|------|------|
| `dify-model-permission-and-publish-gate-design.md` | 旧合并稿（仍含「个人 API 密钥 / account_provider_credentials」） |
| `dify-model-permission-control-design.md` | 旧拆分：仅模型权限（含个人密钥） |
| `dify-publish-approval-control-design.md` | 旧拆分：仅发布门控 |

**现行规范（唯一权威来源）：**

- `docs/superpowers/specs/2026-07-31-model-permissions-and-publish-gate-design.md`

`docs/dm/` 下不再保留该主题的副本或拆分文件。

现行设计范围：管理员模型白名单 + 发布到部门的权限门控；**不再包含**用户个人 API 密钥。
