from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

PASSWORD = "QaTest1234"
EMAIL_DOMAIN = "dify.test"
CONSOLE_URL = "http://localhost:3000"
APP_PREFIX = "[QA]"
DEFAULT_DEPARTMENT_NAME = "默认部门"

Role = Literal["admin", "editor", "normal", "dataset_operator"]

ROLE_LABELS: dict[Role, str] = {
    "admin": "管理员",
    "editor": "编辑",
    "normal": "成员",
    "dataset_operator": "知识库管理员",
}


@dataclass(frozen=True)
class DepartmentSpec:
    name: str
    parent_name: str | None = None


@dataclass(frozen=True)
class AccountSpec:
    name: str
    email: str
    role: Role
    department: str
    is_department_admin: bool


@dataclass(frozen=True)
class AppSpec:
    name: str
    department: str
    publish_to: str


@dataclass(frozen=True)
class DatasetSpec:
    name: str
    department: str


DEPARTMENTS: list[DepartmentSpec] = [
    DepartmentSpec("研发部"),
    DepartmentSpec("市场部"),
    DepartmentSpec("法务部"),
    DepartmentSpec("前端组", parent_name="研发部"),
]

ACCOUNTS: list[AccountSpec] = [
    AccountSpec("租户管理员", "qa-dept-admin@dify.test", "admin", "研发部", False),
    AccountSpec("研发部管理员", "qa-dept-rd-lead@dify.test", "editor", "研发部", True),
    AccountSpec("前端组管理员", "qa-dept-fe-lead@dify.test", "editor", "前端组", True),
    AccountSpec("市场部管理员", "qa-dept-mkt-lead@dify.test", "editor", "市场部", True),
    AccountSpec("研发编辑", "qa-dept-rd-editor@dify.test", "editor", "研发部", False),
    AccountSpec("研发普通", "qa-dept-rd-normal@dify.test", "normal", "研发部", False),
    AccountSpec("研发知识库员", "qa-dept-rd-dataset@dify.test", "dataset_operator", "研发部", False),
    AccountSpec("前端编辑", "qa-dept-fe-editor@dify.test", "editor", "前端组", False),
    AccountSpec("前端普通", "qa-dept-fe-normal@dify.test", "normal", "前端组", False),
    AccountSpec("市场编辑", "qa-dept-mkt-editor@dify.test", "editor", "市场部", False),
    AccountSpec("默认部门成员", "qa-dept-default-normal@dify.test", "normal", DEFAULT_DEPARTMENT_NAME, False),
]

APPS: list[AppSpec] = [
    AppSpec("[QA] 研发内部助手", "研发部", "研发部"),
    AppSpec("[QA] 前端组件助手", "前端组", "前端组"),
    AppSpec("[QA] 市场文案助手", "市场部", "市场部"),
    AppSpec("[QA] 默认部门应用", DEFAULT_DEPARTMENT_NAME, DEFAULT_DEPARTMENT_NAME),
    AppSpec("[QA] 跨部门投放", "研发部", "市场部"),
]

DATASETS: list[DatasetSpec] = [
    DatasetSpec("[QA] 研发知识库", "研发部"),
    DatasetSpec("[QA] 前端知识库", "前端组"),
    DatasetSpec("[QA] 市场知识库", "市场部"),
    DatasetSpec("[QA] 默认知识库", DEFAULT_DEPARTMENT_NAME),
]

RESET_DEPARTMENT_ORDER: list[str] = ["前端组", "法务部", "市场部", "研发部"]


def format_roster_table() -> str:
    lines = [
        "显示名\t邮箱\t密码\t角色\t部门\t部门管理员",
    ]
    for account in ACCOUNTS:
        admin = "是" if account.is_department_admin else "否"
        lines.append(
            f"{account.name}\t{account.email}\t{PASSWORD}\t{account.role}\t"
            f"{account.department}\t{admin}"
        )
    return "\n".join(lines)
