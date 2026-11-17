from __future__ import annotations

from typing import Protocol

from department_test_users.plan import Step
from department_test_users.roster import CONSOLE_URL, PASSWORD, format_roster_table


class SeedAborted(Exception):
    pass


class BrowserPort(Protocol):
    def goto(self, url: str) -> None: ...
    def url(self) -> str: ...
    def page_text(self) -> str: ...
    def click_text(self, text: str) -> None: ...
    def fill_by_label(self, label: str, value: str) -> None: ...
    def has_text(self, text: str) -> bool: ...
    def wait_text(self, text: str, timeout_s: float = 10) -> None: ...


def run_plan(steps: list[Step], port: BrowserPort | None = None) -> int:
    if port is None:
        port = BrowserUsePort()
    completed: list[str] = []
    for step in steps:
        try:
            dispatch(step, port)
        except SeedAborted as exc:
            print(f"失败步骤: [{step.action}] {step.summary}")
            print(f"原因: {exc}")
            if completed:
                print("已完成:")
                for item in completed:
                    print(f"  - {item}")
            return 1
        completed.append(step.summary)
        print(f"ok: {step.summary}")
    return 0


def dispatch(step: Step, port: BrowserPort) -> None:
    handlers = {
        "assert_owner_session": _assert_owner_session,
        "create_department": _create_department,
        "create_member": _create_member,
        "create_app": _create_app,
        "transfer_app": _transfer_app,
        "publish_app": _publish_app,
        "create_dataset": _create_dataset,
        "transfer_dataset": _transfer_dataset,
        "delete_app": _delete_app,
        "delete_dataset": _delete_dataset,
        "remove_member": _remove_member,
        "delete_department": _delete_department,
        "print_roster": _print_roster,
    }
    handler = handlers.get(step.action)
    if handler is None:
        raise SeedAborted(f"unimplemented: {step.action}")
    handler(step, port)


def open_settings_tab(port: BrowserPort, tab_label: str) -> None:
    port.goto(CONSOLE_URL)
    try:
        port.click_text("设置")
    except Exception:
        port.click_text("账户")
        port.click_text("设置")
    port.click_text(tab_label)
    port.wait_text(tab_label)


def _assert_owner_session(step: Step, port: BrowserPort) -> None:
    current = port.url()
    if "signin" in current or "login" in current:
        raise SeedAborted("请先用 owner 登录 http://localhost:3000")
    if port.has_text("登录") and not port.has_text("部门管理"):
        raise SeedAborted("请先用 owner 登录 http://localhost:3000")
    port.goto(CONSOLE_URL)
    if "signin" in port.url() or "login" in port.url():
        raise SeedAborted("请先用 owner 登录 http://localhost:3000")
    open_settings_tab(port, "部门管理")
    if not port.has_text("部门管理"):
        raise SeedAborted("当前账号不是 owner/admin，无法管理全部部门")


def _create_department(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    parent_name = step.payload.get("parent_name")
    open_settings_tab(port, "部门管理")
    if port.has_text(name):
        print(f"skip: department {name} already exists")
        return
    port.click_text("创建部门")
    port.fill_by_label("名称", name)
    if parent_name:
        port.click_text("选择父部门")
        port.click_text(str(parent_name))
    port.click_text("创建")
    port.wait_text("部门创建成功")


def _create_member(step: Step, port: BrowserPort) -> None:
    email = str(step.payload["email"])
    role = str(step.payload["role"])
    role_label = str(step.payload["role_label"])
    open_settings_tab(port, "成员")
    if port.has_text(email):
        print(f"skip: member {email} already exists")
        return
    port.click_text("创建成员")
    if role == "dataset_operator" and not port.has_text("知识库管理员"):
        print(f"skip: {email} because 知识库操作员角色在 UI 中不可用")
        port.click_text("取消")
        return
    port.fill_by_label("姓名", str(step.payload["name"]))
    port.fill_by_label("邮箱", email)
    port.fill_by_label("初始密码", PASSWORD)
    port.click_text("部门")
    port.click_text(str(step.payload["department"]))
    port.click_text("角色")
    port.click_text(role_label)
    if step.payload.get("is_department_admin"):
        port.click_text("设为部门管理员")
    port.click_text("创建")
    port.wait_text("成员创建成功")


def _print_roster(step: Step, port: BrowserPort) -> None:
    print(format_roster_table())


def _create_app(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    port.goto(f"{CONSOLE_URL}/apps")
    port.wait_text("工作室")
    if port.has_text(name):
        print(f"skip: app {name} already exists")
        return
    port.click_text("创建应用")
    port.click_text("创建空白应用")
    port.click_text("助手")
    port.fill_by_label("应用名称 & 图标", name)
    port.click_text("创建")
    port.wait_text("应用已创建")
    port.goto(f"{CONSOLE_URL}/apps")


def _transfer_app(step: Step, port: BrowserPort) -> None:
    _transfer_resource(port, str(step.payload["name"]), str(step.payload["department"]), f"{CONSOLE_URL}/apps")


def _transfer_dataset(step: Step, port: BrowserPort) -> None:
    _transfer_resource(port, str(step.payload["name"]), str(step.payload["department"]), f"{CONSOLE_URL}/datasets")


def _transfer_resource(port: BrowserPort, name: str, department: str, list_url: str) -> None:
    port.goto(list_url)
    if not port.has_text(name):
        raise SeedAborted(f"未找到 {name}，无法转移")
    port.click_text("转移部门")
    try:
        port.click_text(department)
        port.click_text("确认")
        port.wait_text("部门转移成功")
    except Exception:
        try:
            port.click_text("取消")
        except Exception:
            pass
        print(f"skip: {name} already in {department} or transfer cancelled")


def _publish_app(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    department = str(step.payload["department"])
    port.goto(f"{CONSOLE_URL}/apps")
    if not port.has_text(name):
        raise SeedAborted(f"未找到应用 {name}，无法发布")
    port.click_text(name)
    port.click_text("监测")
    if port.has_text("部门发布") and port.has_text(department):
        print(f"skip: app {name} already published to {department}")
        return
    port.click_text("编辑发布部门")
    port.click_text(department)
    port.click_text("保存")
    port.wait_text("发布部门保存成功")


def _create_dataset(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    port.goto(f"{CONSOLE_URL}/datasets")
    if port.has_text(name):
        print(f"skip: dataset {name} already exists")
        return
    try:
        port.click_text("创建空知识库")
    except Exception:
        port.click_text("创建知识库")
        port.click_text("创建空知识库")
    port.fill_by_label("名称", name)
    port.click_text("创建")
    port.goto(f"{CONSOLE_URL}/datasets")
    if not port.has_text(name):
        raise SeedAborted(f"知识库 {name} 创建后未出现在列表中")


def _delete_app(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    port.goto(f"{CONSOLE_URL}/apps")
    if not port.has_text(name):
        print(f"skip: app {name} not found")
        return
    port.click_text("删除")
    port.fill_by_label("请输入", name)
    port.click_text("确认")
    port.wait_text("应用已删除")


def _delete_dataset(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    port.goto(f"{CONSOLE_URL}/datasets")
    if not port.has_text(name):
        print(f"skip: dataset {name} not found")
        return
    port.click_text("删除")
    port.click_text("确认")
    port.wait_text("知识库已删除")


def _remove_member(step: Step, port: BrowserPort) -> None:
    email = str(step.payload["email"])
    open_settings_tab(port, "成员")
    if not port.has_text(email):
        print(f"skip: member {email} not found")
        return
    port.click_text("删除成员")
    port.click_text("确认")


def _delete_department(step: Step, port: BrowserPort) -> None:
    name = str(step.payload["name"])
    open_settings_tab(port, "部门管理")
    if not port.has_text(name):
        print(f"skip: department {name} not found")
        return
    port.click_text(name)
    port.click_text("删除")
    if port.has_text("请先转移") or port.has_text("仍有"):
        raise SeedAborted(f"无法删除部门 {name}：仍有成员或资源")
    port.click_text("确认")
    port.wait_text("部门删除成功")


CDP_ENDPOINTS = ("http://127.0.0.1:9222", "http://127.0.0.1:9229")


class BrowserUsePort:
    """Attach to the already-logged-in local Chrome via Playwright CDP."""

    def __init__(self) -> None:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise SeedAborted("缺少 playwright。请用 dev/seed-department-test-users 入口运行。") from exc

        self._playwright = sync_playwright().start()
        last_error: Exception | None = None
        self._browser = None
        for endpoint in CDP_ENDPOINTS:
            try:
                self._browser = self._playwright.chromium.connect_over_cdp(endpoint)
                break
            except Exception as exc:  # noqa: BLE001 - try the next debug port
                last_error = exc
        if self._browser is None:
            raise SeedAborted(
                "无法连接到已登录的 Chrome。请用 --remote-debugging-port=9222 启动 Chrome，"
                "并先在 http://localhost:3000 用 owner 登录。"
            ) from last_error
        self._page = self._pick_page()
        self._page.set_default_timeout(15_000)

    def _pick_page(self):
        for context in self._browser.contexts:
            for page in context.pages:
                if "localhost:3000" in page.url:
                    return page
        for context in self._browser.contexts:
            if context.pages:
                return context.pages[0]
        raise SeedAborted("Chrome 没有打开的页面。请先打开 http://localhost:3000")

    def goto(self, url: str) -> None:
        self._page = self._pick_page()
        self._page.goto(url, wait_until="domcontentloaded")
        self._page.wait_for_timeout(400)

    def url(self) -> str:
        return self._page.url

    def page_text(self) -> str:
        return self._page.inner_text("body")

    def click_text(self, text: str) -> None:
        locator = self._page.get_by_text(text, exact=True)
        if locator.count() == 0:
            locator = self._page.get_by_role("button", name=text, exact=True)
        if locator.count() == 0:
            raise SeedAborted(f"页面上找不到文案: {text}")
        locator.first.click()
        self._page.wait_for_timeout(200)

    def fill_by_label(self, label: str, value: str) -> None:
        by_label = self._page.get_by_label(label, exact=False)
        if by_label.count() > 0:
            by_label.first.fill(value)
            return
        labeled = self._page.locator("label").filter(has_text=label)
        if labeled.count() > 0:
            following = labeled.first.locator("xpath=following::input[1] | following::textarea[1]")
            if following.count() > 0:
                following.first.fill(value)
                return
        by_placeholder = self._page.get_by_placeholder(label, exact=False)
        if by_placeholder.count() > 0:
            by_placeholder.first.fill(value)
            return
        raise SeedAborted(f"页面上找不到输入框: {label}")

    def has_text(self, text: str) -> bool:
        return text in self.page_text()

    def wait_text(self, text: str, timeout_s: float = 10) -> None:
        self._page.get_by_text(text, exact=False).first.wait_for(timeout=int(timeout_s * 1000))
