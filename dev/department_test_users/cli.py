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
