# Task 18 Report: 发布模型与迁移

## Status
DONE

## Commits
- `07fc1f4391` — feat(department): app_published_departments table with auto-publish backfill

## Test Summary
7 passed, 0 failed (test_department.py)

## Changes
- `api/models/department.py`: Added `AppPublishedDepartment` model with id, app_id, department_id, published_by, created_at + unique constraint + two indexes
- `api/models/__init__.py`: Added import and `__all__` entry for `AppPublishedDepartment`
- `api/migrations/versions/2026_08_26_1100-b3e5f7a9c1d2_add_app_published_departments.py`: Created migration with table creation and auto-publish backfill INSERT for existing apps (enable_site=true, department_id IS NOT NULL, status='normal'), ON CONFLICT DO NOTHING
- `api/tests/unit_tests/models/test_department.py`: Added 2 tests for table name/columns and constraints/indexes

## Verification
- T8 migration CI alignment: `flask db upgrade --sql` generates valid SQL with correct CREATE TABLE, indexes, and backfill INSERT
- Ruff lint and format: all checks passed
- Pre-commit hooks (ruff, eslint, tsgo): all passed

## Concerns
None
