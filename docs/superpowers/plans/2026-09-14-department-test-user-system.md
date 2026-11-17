# 部门测试用户体系 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提供 `dev/seed-department-test-users`，通过真实控制台页面在本地现有租户中录入部门测试用户体系，并在本机跑通一次。

**Architecture:** 纯 Python 名单与步骤计划（可单测、可 `--dry-run`）与 `BrowserPort` 适配器分离。适配器只点击页面上的按钮和表单，禁止 `fetch` 调 Console API、禁止写数据库。浏览器实现用 browser-use / Cursor 浏览器工具驱动 `http://localhost:3000`。

**Tech Stack:** Python 3.12+、pytest（仅测 `dev/department_test_users`）、bash 入口、本机 Chrome CDP（browser-use）。

**Spec:** `docs/superpowers/specs/2026-09-14-department-test-user-system-design.md`

## Global Constraints

- 沟通与页面文案按简体中文；选择器锁定 `web/i18n/zh-Hans` 文案，不靠 CSS class
- 不直写数据库、不调用 Flask Service、不在页面里 `fetch('/console/api/...')`
- 全程使用当前已登录 owner；未登录或非 owner 则停止，不代填密码
- 统一密码 `QaTest1234`；邮箱域名 `@dify.test`；应用/知识库名称前缀 `[QA]`
- 不改现有 owner 的邮箱、密码、角色、所属部门；不删除默认部门
- 不为产品功能新增 pytest/Vitest；只为 `dev/department_test_users` 的计划/CLI 写单测
- 实验脚本只放 `dev/`，不进 `api/commands/`
- 控制台地址 `http://localhost:3000`
- 任一步失败即停，打印已完成项与失败步骤，不自动回滚
- 用户未明确要求时不要 `git commit`（跳过各任务 Commit 步骤）
- Python 风格：双引号、行宽 120；测试命令：`uv run --with pytest python -m pytest /home/lazylee/git/dify/dev/department_test_users -q`

---

## File map

| 文件 | 职责 |
|------|------|
| `dev/department_test_users/roster.py` | 部门、账号、应用、知识库常量与账号表打印 |
| `dev/department_test_users/plan.py` | `Step` 与 `build_plan(reset=...)` |
| `dev/department_test_users/cli.py` | 参数解析、dry-run、调度 runner |
| `dev/department_test_users/browser.py` | `BrowserPort` 协议 + 各 `action` 的页面操作 |
| `dev/department_test_users/test_roster.py` | 名单与 spec 对齐 |
| `dev/department_test_users/test_plan.py` | 步骤顺序、reset 范围、dry-run |
| `dev/department_test_users/test_cli.py` | `--dry-run` / `--reset` 参数 |
| `dev/seed-department-test-users` | bash 入口 |

---

### Task 1: 名单、步骤计划、dry-run CLI

**Files:**
- Create: `dev/department_test_users/__init__.py`
- Create: `dev/department_test_users/roster.py`
- Create: `dev/department_test_users/plan.py`
- Create: `dev/department_test_users/cli.py`
- Test: `dev/department_test_users/test_roster.py`
- Test: `dev/department_test_users/test_plan.py`
- Test: `dev/department_test_users/test_cli.py`

**Interfaces:**
- Consumes: spec 第 3–6 节
- Produces:
  - `PASSWORD: str`、`EMAIL_DOMAIN: str`、`CONSOLE_URL: str`、`APP_PREFIX: str`
  - `DEPARTMENTS: list[DepartmentSpec]`、`ACCOUNTS: list[AccountSpec]`、`APPS: list[AppSpec]`、`DATASETS: list[DatasetSpec]`
  - `format_roster_table() -> str`
  - `Step(action: str, summary: str, payload: dict[str, str \| bool \| None])`
  - `build_plan(*, reset: bool) -> list[Step]`
  - `parse_args(argv: list[str] \| None) -> argparse.Namespace`（`reset: bool`、`dry_run: bool`）
  - `render_dry_run(steps: list[Step]) -> str`
  - `main(argv: list[str] \| None = None) -> int`（本任务 dry-run 可跑通；非 dry-run 先 `raise SystemExit` 提示 Task 2 未接 runner，见下方）

- [ ] **Step 1: 写失败测试**

```python
# dev/department_test_users/test_roster.py
from department_test_users.roster import ACCOUNTS, APPS, DATASETS, DEPARTMENTS, EMAIL_DOMAIN, PASSWORD, format_roster_table


def test_password_is_not_default_member_password():
    assert PASSWORD == "QaTest1234"
    assert PASSWORD != "Dify1234"


def test_department_create_order():
    assert [d.name for d in DEPARTMENTS] == ["研发部", "市场部", "法务部", "前端组"]
    fe = next(d for d in DEPARTMENTS if d.name == "前端组")
    assert fe.parent_name == "研发部"
    assert all(d.parent_name is None for d in DEPARTMENTS if d.name != "前端组")


def test_eleven_accounts_and_email_domain():
    assert len(ACCOUNTS) == 11
    assert all(a.email.endswith(f"@{EMAIL_DOMAIN}") for a in ACCOUNTS)
    emails = {a.email for a in ACCOUNTS}
    assert "qa-dept-rd-dataset@dify.test" in emails
    assert "qa-dept-admin@dify.test" in emails


def test_dept_admins_are_editors():
    admins = [a for a in ACCOUNTS if a.is_department_admin]
    assert {a.email for a in admins} == {
        "qa-dept-rd-lead@dify.test",
        "qa-dept-fe-lead@dify.test",
        "qa-dept-mkt-lead@dify.test",
    }
    assert all(a.role == "editor" for a in admins)


def test_apps_and_datasets_use_qa_prefix():
    assert len(APPS) == 5
    assert len(DATASETS) == 4
    assert all(item.name.startswith("[QA]") for item in (*APPS, *DATASETS))
    cross = next(app for app in APPS if app.name == "[QA] 跨部门投放")
    assert cross.department == "研发部"
    assert cross.publish_to == "市场部"


def test_roster_table_contains_password_and_emails():
    table = format_roster_table()
    assert "QaTest1234" in table
    assert "qa-dept-fe-normal@dify.test" in table
```

```python
# dev/department_test_users/test_plan.py
from department_test_users.plan import build_plan
from department_test_users.roster import ACCOUNTS, APPS, DATASETS, DEPARTMENTS


def _actions(reset: bool) -> list[str]:
    return [step.action for step in build_plan(reset=reset)]


def test_seed_plan_starts_with_session_and_ends_with_roster():
    actions = _actions(False)
    assert actions[0] == "assert_owner_session"
    assert actions[-1] == "print_roster"
    assert "delete_app" not in actions
    assert "delete_department" not in actions


def test_seed_plan_creates_in_spec_order():
    actions = _actions(False)
    assert actions.count("create_department") == len(DEPARTMENTS)
    assert actions.count("create_member") == len(ACCOUNTS)
    assert actions.count("create_app") == len(APPS)
    assert actions.count("transfer_app") == len(APPS)
    assert actions.count("publish_app") == len(APPS)
    assert actions.count("create_dataset") == len(DATASETS)
    assert actions.count("transfer_dataset") == len(DATASETS)
    dept_names = [s.payload["name"] for s in build_plan(reset=False) if s.action == "create_department"]
    assert dept_names == ["研发部", "市场部", "法务部", "前端组"]
    create_idx = actions.index("create_department")
    member_idx = actions.index("create_member")
    app_idx = actions.index("create_app")
    dataset_idx = actions.index("create_dataset")
    assert create_idx < member_idx < app_idx < dataset_idx


def test_frontend_group_has_parent():
    fe = next(s for s in build_plan(reset=False) if s.action == "create_department" and s.payload["name"] == "前端组")
    assert fe.payload["parent_name"] == "研发部"


def test_reset_plan_deletes_before_recreate_and_never_touches_default_dept():
    steps = build_plan(reset=True)
    actions = [s.action for s in steps]
    assert actions[0] == "assert_owner_session"
    reset_actions = actions[1:actions.index("create_department")]
    assert reset_actions[: len(APPS)] == ["delete_app"] * len(APPS)
    assert "delete_dataset" in reset_actions
    assert "remove_member" in reset_actions
    dept_deletes = [s.payload["name"] for s in steps if s.action == "delete_department"]
    assert dept_deletes == ["前端组", "法务部", "市场部", "研发部"]
    assert "默认部门" not in dept_deletes
    remove_emails = [s.payload["email"] for s in steps if s.action == "remove_member"]
    assert all(email.endswith("@dify.test") for email in remove_emails)
    assert len(remove_emails) == len(ACCOUNTS)
```

```python
# dev/department_test_users/test_cli.py
from department_test_users.cli import parse_args, render_dry_run
from department_test_users.plan import build_plan


def test_parse_args_defaults():
    ns = parse_args([])
    assert ns.reset is False
    assert ns.dry_run is False


def test_parse_args_flags():
    ns = parse_args(["--reset", "--dry-run"])
    assert ns.reset is True
    assert ns.dry_run is True


def test_dry_run_lists_summaries():
    text = render_dry_run(build_plan(reset=False))
    assert "assert_owner_session" in text
    assert "研发部" in text
    assert "qa-dept-rd-lead@dify.test" in text
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
cd /home/lazylee/git/dify/dev && uv run --with pytest python -m pytest department_test_users -q
```

Expected: FAIL（`No module named department_test_users` 或 import 失败）

- [ ] **Step 3: 写最小实现**

`dev/department_test_users/__init__.py` 为空文件。

```python
# dev/department_test_users/roster.py
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
```

```python
# dev/department_test_users/plan.py
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
```

```python
# dev/department_test_users/cli.py
from __future__ import annotations

import argparse
import sys

from department_test_users.plan import Step, build_plan


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="通过控制台页面录入部门测试用户体系")
    parser.add_argument("--reset", action="store_true", help="先按页面删除这批测试数据再重建")
    parser.add_argument("--dry-run", action="store_true", help="只打印步骤，不操作浏览器")
    return parser.parse_args(argv)


def render_dry_run(steps: list[Step]) -> str:
    lines = [f"{index}. [{step.action}] {step.summary}" for index, step in enumerate(steps, start=1)]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    steps = build_plan(reset=args.reset)
    if args.dry_run:
        print(render_dry_run(steps))
        return 0
    from department_test_users.browser import run_plan

    return run_plan(steps)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
```

本任务先不要实现 `browser.py`。测试只覆盖 dry-run / roster / plan。为让 `cli.main([])` 在未接 runner 时不误导，不要在本任务的测试里调用非 dry-run 的 `main()`。

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
cd /home/lazylee/git/dify/dev && uv run --with pytest python -m pytest department_test_users -q
```

Expected: PASS（`test_roster.py`、`test_plan.py`、`test_cli.py` 全部通过）

- [ ] **Step 5: Commit** — 用户未要求则跳过。若要求：`git add dev/department_test_users && git commit -m "feat(dev): add department test-user roster and dry-run plan"`

---

### Task 2: BrowserPort 与部门/成员页面操作

**Files:**
- Create: `dev/department_test_users/browser.py`
- Modify: `dev/department_test_users/test_plan.py`（可追加 mock runner 测试，或新建 `test_browser.py`）
- Test: `dev/department_test_users/test_browser.py`

**Interfaces:**
- Consumes: `Step`、`PASSWORD`、`CONSOLE_URL`、`format_roster_table`
- Produces:
  - `class SeedAborted(Exception)`
  - `class BrowserPort` Protocol：`goto(url: str) -> None`、`url() -> str`、`page_text() -> str`、`click_text(text: str) -> None`、`fill_by_label(label: str, value: str) -> None`、`has_text(text: str) -> bool`、`wait_text(text: str, timeout_s: float = 10) -> None`
  - `run_plan(steps: list[Step], port: BrowserPort | None = None) -> int`
  - `dispatch(step: Step, port: BrowserPort) -> None`
  - 本任务必须实现的 action：`assert_owner_session`、`create_department`、`create_member`、`print_roster`
  - 其余 action 可先 `raise SeedAborted(f"unimplemented: {step.action}")`，Task 3 补齐

页面文案（zh-Hans，必须按这些点）：

| 用途 | 文案 |
|------|------|
| 头像菜单 | aria/可访问名「账户」或头像；再点「设置」 |
| 部门页 | 「部门管理」 |
| 创建部门 | 「创建部门」；名称「输入部门名称」；父部门「选择父部门」/「无父部门（根级别）」；成功 toast「部门创建成功」 |
| 成员页 | 「成员」；「创建成员」 |
| 成员表单 | 「姓名」「邮箱」「初始密码」「部门」；角色「管理员」「编辑」「成员」「知识库管理员」；勾选「设为部门管理员」；成功 toast「成员创建成功」 |

幂等：`has_text` 已见部门名 / 邮箱则跳过创建，并打印 `skip: ... already exists`。

`assert_owner_session`：打开 `CONSOLE_URL`；若 URL 含 `signin`/`login` 或页面有登录表单，`raise SeedAborted("请先用 owner 登录 http://localhost:3000")`。打开设置后若看不到「部门管理」，`raise SeedAborted("当前账号不是 owner/admin，无法管理全部部门")`。

禁止用 JS 直接调 API。允许对真实按钮/input 做 DOM click 或坐标点击。

- [ ] **Step 1: 写失败测试**

```python
# dev/department_test_users/test_browser.py
from department_test_users.browser import SeedAborted, dispatch
from department_test_users.plan import Step
from department_test_users.roster import CONSOLE_URL


class FakePort:
    def __init__(self, url: str = f"{CONSOLE_URL}/apps", text: str = "工作室\n部门管理\n成员") -> None:
        self._url = url
        self._text = text
        self.gotos: list[str] = []
        self.clicks: list[str] = []
        self.fills: list[tuple[str, str]] = []

    def goto(self, url: str) -> None:
        self.gotos.append(url)
        self._url = url

    def url(self) -> str:
        return self._url

    def page_text(self) -> str:
        return self._text

    def click_text(self, text: str) -> None:
        self.clicks.append(text)

    def fill_by_label(self, label: str, value: str) -> None:
        self.fills.append((label, value))

    def has_text(self, text: str) -> bool:
        return text in self._text

    def wait_text(self, text: str, timeout_s: float = 10) -> None:
        if text not in self._text:
            raise TimeoutError(text)


def test_assert_owner_session_aborts_on_signin():
    port = FakePort(url="http://localhost:3000/signin", text="登录")
    try:
        dispatch(Step("assert_owner_session", "确认 owner 已登录"), port)
    except SeedAborted as exc:
        assert "登录" in str(exc)
    else:
        raise AssertionError("expected SeedAborted")


def test_create_department_skips_when_name_visible():
    port = FakePort(text="研发部\n市场部")
    dispatch(Step("create_department", "创建部门 研发部", {"name": "研发部", "parent_name": None}), port)
    assert "创建部门" not in port.clicks


def test_create_member_fills_password_and_dept_admin():
    port = FakePort(text="创建成员\n姓名")
    dispatch(
        Step(
            "create_member",
            "创建成员 qa-dept-rd-lead@dify.test",
            {
                "name": "研发部管理员",
                "email": "qa-dept-rd-lead@dify.test",
                "role": "editor",
                "role_label": "编辑",
                "department": "研发部",
                "is_department_admin": True,
            },
        ),
        port,
    )
    assert ("初始密码", "QaTest1234") in port.fills
    assert "设为部门管理员" in port.clicks
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
cd /home/lazylee/git/dify/dev && uv run --with pytest python -m pytest department_test_users/test_browser.py -q
```

Expected: FAIL（`browser` 模块不存在）

- [ ] **Step 3: 写最小实现**

在 `browser.py` 实现 Protocol、`SeedAborted`、`dispatch` 对上述 4 个 action 的处理，以及 `open_settings_tab(port, tab_label: str)`：

1. `goto(CONSOLE_URL)`
2. `click_text("设置")`；若失败则先点账户头像再点「设置」
3. `click_text(tab_label)`（「部门管理」或「成员」）
4. `wait_text(tab_label)`

`create_department`：打开部门管理；`has_text(name)` 则 return；点「创建部门」；`fill_by_label("名称", name)`（placeholder 是「输入部门名称」，label 是「名称」）；若 `parent_name` 有值则点「选择父部门」再点父部门名，否则保持根级；点弹窗里的创建确认；`wait_text("部门创建成功")` 或等待树中出现该名称。

`create_member`：打开成员；`has_text(email)` 则 return；点「创建成员」；填姓名/邮箱/初始密码；选部门、角色；若 `is_department_admin` 点「设为部门管理员」；提交；若角色是知识库管理员且页面没有该选项，打印 skip 原因并 return，不视为失败；成功则 `wait_text("成员创建成功")`。

`print_roster`：`print(format_roster_table())`。

`run_plan`：逐个 `dispatch`；捕获 `SeedAborted` 打印失败步骤后 `return 1`；成功 `return 0`。

真实 `BrowserPort` 适配器（`BrowserUsePort`）本任务可以先写骨架：用 `js(...)` 按可见文本查找 `button, a, [role=menuitem], label, input`。完整 CDP 点击放到本任务或 Task 3 一次补齐，但 FakePort 测试必须通过。

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
cd /home/lazylee/git/dify/dev && uv run --with pytest python -m pytest department_test_users -q
```

Expected: PASS

- [ ] **Step 5: Commit** — 用户未要求则跳过。若要求：`git commit -m "feat(dev): drive department and member forms via BrowserPort"`

---

### Task 3: 应用、知识库、发布、reset 与 bash 入口

**Files:**
- Modify: `dev/department_test_users/browser.py`（补齐剩余 action + 真实 BrowserUsePort）
- Modify: `dev/department_test_users/test_browser.py`
- Create: `dev/seed-department-test-users`

**Interfaces:**
- Consumes: Task 1 的 `APPS`/`DATASETS`/`RESET_DEPARTMENT_ORDER`；Task 2 的 `dispatch`/`BrowserPort`
- Produces: 全部 `Step.action` 可执行；`dev/seed-department-test-users` 可调用 `cli.main`

页面文案：

| 用途 | 文案 |
|------|------|
| 工作室 | 侧栏「工作室」，URL `/apps` |
| 创建应用 | 「创建应用」→「创建空白应用」→ 类型「助手」→ 名称 →「创建」 |
| 转移 | 卡片菜单「转移部门」→ 选目标 → 确认；toast「部门转移成功」 |
| 发布 | 进入应用 →「监测」→「编辑发布部门」/「发布到部门」→ 勾选目标部门 → 保存；toast「发布部门保存成功」 |
| 知识库 | 侧栏知识库，URL `/datasets`；「创建知识库」或「创建空知识库」→ 只填名称 |
| 删应用 | 卡片删除；确认框需输入应用名；toast「应用已删除」 |
| 删知识库 | 卡片删除 |
| 移出成员 | 成员行操作「删除成员」 |
| 删部门 | 部门详情「删除」；确认「删除部门」 |

幂等：

- `create_app` / `create_dataset`：列表已有精确名称则跳过
- `transfer_*`：若卡片/详情已显示目标部门则跳过
- `publish_app`：发布面板已包含目标部门则跳过
- `delete_*` / `remove_member`：对象不存在则跳过

reset 失败：删除部门时页面提示仍有成员/应用/知识库，则 `SeedAborted` 并写出残留名称。

- [ ] **Step 1: 写失败测试**

在 `test_browser.py` 追加：

```python
def test_delete_department_order_payload_is_leaf_first():
    from department_test_users.plan import build_plan

    names = [s.payload["name"] for s in build_plan(reset=True) if s.action == "delete_department"]
    assert names == ["前端组", "法务部", "市场部", "研发部"]


def test_delete_app_skips_when_missing():
    port = FakePort(text="工作室")
    dispatch(Step("delete_app", "删除应用 [QA] 研发内部助手", {"name": "[QA] 研发内部助手"}), port)
    assert "删除" not in port.clicks


def test_unimplemented_no_longer_raised_for_app_actions():
    port = FakePort(text="[QA] 研发内部助手\n研发部")
    dispatch(Step("transfer_app", "转移", {"name": "[QA] 研发内部助手", "department": "研发部"}), port)
```

- [ ] **Step 2: 跑测试确认失败** — `uv run --with pytest python -m pytest department_test_users/test_browser.py -q` → FAIL（`transfer_app` 仍 unimplemented）

- [ ] **Step 3: 实现剩余 action 与 bash 入口**

`create_app`：`goto(f"{CONSOLE_URL}/apps")`；已有名称则 skip；点「创建应用」→「创建空白应用」；点「助手」（chat）；`fill_by_label` 应用名称；点「创建」；`wait_text("应用已创建")`；再 `goto /apps`（创建后会跳进应用详情）。

`transfer_app` / `transfer_dataset`：在对应列表找到卡片；若已显示目标部门则 skip；点「转移部门」；点目标部门名；确认。

`publish_app`：从列表点进应用；点「监测」；点「编辑发布部门」或「发布到部门」；勾选 `payload["department"]`；保存。

`create_dataset`：`goto /datasets`；已有则 skip；走空知识库创建，名称最长 40，当前名单均短于 40。创建后会进文档页，再回到 `/datasets`。

`delete_app`：列表无该名称则 skip；打开删除确认并输入应用名。

`remove_member`：成员页无该邮箱则 skip；点该行「删除成员」并确认。

`delete_department`：部门树无该名则 skip；点进详情 →「删除」→ 确认。若出现「请先转移」类错误，`raise SeedAborted`。

真实端口：`BrowserUsePort` 用 browser-use 的 `new_tab`/`goto_url`/`js`/`click_at_xy`。查找策略：先 AX 名，再 `document.querySelectorAll` 文本精确匹配。`run_plan` 在 `port is None` 时构造 `BrowserUsePort()`。

```bash
# dev/seed-department-test-users
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$(realpath "$0")")/.." && pwd)"
cd "$ROOT/dev"
exec uv run python -m department_test_users.cli "$@"
```

`chmod +x dev/seed-department-test-users`

若 `python -m department_test_users.cli` 因包路径失败，改为：

```bash
exec uv run python "$ROOT/dev/department_test_users/cli.py" "$@"
```

并保证 `cli.py` 能以脚本方式把 `dev/` 加入 `sys.path`。优先用 package。在 `dev/department_test_users/__init__.py` 保持空即可。运行模块时工作目录必须是 `dev/`。

- [ ] **Step 4: 跑测试确认通过**

```bash
cd /home/lazylee/git/dify/dev && uv run --with pytest python -m pytest department_test_users -q
/home/lazylee/git/dify/dev/seed-department-test-users --dry-run | head
```

Expected: pytest PASS；dry-run 打印以 `1. [assert_owner_session]` 开头的步骤列表

- [ ] **Step 5: Commit** — 用户未要求则跳过。若要求：`git commit -m "feat(dev): seed department test users through console UI"`

---

### Task 4: 在本地控制台真正录入

**Files:**
- 无新文件。操作 `http://localhost:3000` 与本机 Chrome。

**Interfaces:**
- Consumes: `dev/seed-department-test-users`
- Produces: 现有租户中的部门树、11 个（或 10 个）`@dify.test` 账号、5 个 `[QA]` 应用、4 个 `[QA]` 知识库

- [ ] **Step 1: 确认前置**

```bash
dev/status-dev-env
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health
```

Expected: 前端 200；API 健康。若未启动，先 `dev/start-dev-env --skip-middleware`（中间件已在时）。

- [ ] **Step 2: dry-run**

```bash
/home/lazylee/git/dify/dev/seed-department-test-users --dry-run
```

Expected: 步骤含创建四部门、11 成员、5 应用、4 知识库；无 delete_*。

- [ ] **Step 3: 确认 Chrome 里 owner 已登录 localhost:3000**

用浏览器打开控制台。若在登录页：停止，请用户用 owner 登录后再继续。不要替用户输入密码。

- [ ] **Step 4: 执行录入**

```bash
/home/lazylee/git/dify/dev/seed-department-test-users
```

若 browser-use 连不上 Chrome：按 browser-use 技能跑 `browser-use --doctor`，请用户允许 remote debugging 后重试。

脚本也可用 Cursor `cursor-ide-browser` 按同一 `build_plan(reset=False)` 逐步点。无论哪种驱动，必须点页面，禁止写库。

Expected: 退出码 0；终端打印账号表；失败则打印停在哪一步。

- [ ] **Step 5: 用浏览器核对（不只截图）**

以 owner 身份：

1. 设置 → 部门管理：看到默认部门、研发部/前端组、市场部、法务部（法务部无成员）
2. 设置 → 成员：11 个 `@dify.test` 邮箱（知识库管理员项若被跳过则 10 个），密码未在 UI 展示，以脚本输出为准
3. 工作室：5 个 `[QA]` 应用；`[QA] 跨部门投放` 归属研发部
4. 打开 `[QA] 跨部门投放` → 监测：发布部门含市场部
5. 知识库：4 个 `[QA]` 知识库，部门与 spec 第 5.2 节一致

不要在这一步用测试账号登录改密码。切账号验证留给用户按 spec 第 7 节手测。

- [ ] **Step 6: Commit** — 用户未要求则跳过。运行时 ID 禁止入库。

---

## Self-review

1. Spec 覆盖：组织树 Task 1+2；账号 Task 1+2；应用/知识库/发布 Task 3；脚本入口/dry-run/reset Task 1+3；前置与真实录入 Task 4；不写库 Task 2/3 约束；dataset_operator 跳过 Task 2。
2. 无 TBD/TODO。
3. 类型：`Step.action` 字符串在 Task 1 定义，Task 2/3 `dispatch` 使用同一批名字。
