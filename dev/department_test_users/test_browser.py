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
    port = FakePort(text="部门管理\n研发部\n市场部")
    dispatch(Step("create_department", "创建部门 研发部", {"name": "研发部", "parent_name": None}), port)
    assert "创建部门" not in port.clicks


def test_create_member_fills_password_and_dept_admin():
    port = FakePort(text="成员\n创建成员\n姓名\n成员创建成功")
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
