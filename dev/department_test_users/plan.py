from __future__ import annotations

from dataclasses import dataclass, field

from department_test_users.roster import (
    ACCOUNTS,
    APPS,
    DATASETS,
    DEPARTMENTS,
    RESET_DEPARTMENT_ORDER,
    ROLE_LABELS,
)


@dataclass(frozen=True)
class Step:
    action: str
    summary: str
    payload: dict[str, str | bool | None] = field(default_factory=dict)


def build_plan(*, reset: bool) -> list[Step]:
    steps = [Step("assert_owner_session", "确认 owner 已登录")]
    if reset:
        steps.extend(_reset_steps())
    steps.extend(_seed_steps())
    steps.append(Step("print_roster", "打印账号表"))
    return steps


def _reset_steps() -> list[Step]:
    steps: list[Step] = []
    for app in APPS:
        steps.append(Step("delete_app", f"删除应用 {app.name}", {"name": app.name}))
    for dataset in DATASETS:
        steps.append(Step("delete_dataset", f"删除知识库 {dataset.name}", {"name": dataset.name}))
    for account in ACCOUNTS:
        steps.append(Step("remove_member", f"移出成员 {account.email}", {"email": account.email}))
    for name in RESET_DEPARTMENT_ORDER:
        steps.append(Step("delete_department", f"删除部门 {name}", {"name": name}))
    return steps


def _seed_steps() -> list[Step]:
    steps: list[Step] = []
    for dept in DEPARTMENTS:
        steps.append(
            Step(
                "create_department",
                f"创建部门 {dept.name}",
                {"name": dept.name, "parent_name": dept.parent_name},
            )
        )
    for account in ACCOUNTS:
        steps.append(
            Step(
                "create_member",
                f"创建成员 {account.email}",
                {
                    "name": account.name,
                    "email": account.email,
                    "role": account.role,
                    "role_label": ROLE_LABELS[account.role],
                    "department": account.department,
                    "is_department_admin": account.is_department_admin,
                },
            )
        )
    for app in APPS:
        steps.append(Step("create_app", f"创建应用 {app.name}", {"name": app.name}))
        steps.append(
            Step(
                "transfer_app",
                f"转移应用 {app.name} 到 {app.department}",
                {"name": app.name, "department": app.department},
            )
        )
        steps.append(
            Step(
                "publish_app",
                f"发布应用 {app.name} 到 {app.publish_to}",
                {"name": app.name, "department": app.publish_to},
            )
        )
    for dataset in DATASETS:
        steps.append(Step("create_dataset", f"创建知识库 {dataset.name}", {"name": dataset.name}))
        steps.append(
            Step(
                "transfer_dataset",
                f"转移知识库 {dataset.name} 到 {dataset.department}",
                {"name": dataset.name, "department": dataset.department},
            )
        )
    return steps
