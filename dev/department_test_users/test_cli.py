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
