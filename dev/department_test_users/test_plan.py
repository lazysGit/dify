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
