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
