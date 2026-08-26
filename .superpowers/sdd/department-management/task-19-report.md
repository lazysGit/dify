# Task 19 Report: Publish Service + API

## Status: DONE

## Summary
Implemented app publish-departments API with `can_access` authorization, delete cascade, and department deletion guard.

## Files Created
- `api/services/app_publish_service.py` - `AppPublishService` with `get_published_departments`, `update_published_departments`, `can_access`
- `api/controllers/console/app/publish_department.py` - GET/PUT `/apps/<uuid:app_id>/publish-departments` with `@get_app_model` + `@edit_permission_required`
- `api/tests/unit_tests/services/test_app_publish_service.py` - 11 tests
- `api/tests/unit_tests/controllers/console/app/test_publish_department_api.py` - 7 tests

## Files Modified
- `api/services/department_service.py` - Added 6th check in `delete_department`: blocks if department is a publish target
- `api/services/app_service.py` - Added cascade delete of `app_published_departments` in `delete_app`
- `api/controllers/console/__init__.py` - Registered `publish_department` module

## Test Summary
18 tests pass (11 service + 7 controller), 793 regression tests pass (`-k app`)

## Key Design Decisions
- `enable_site=false` raises `ValueError` in service, translated to `BadRequest` (400) in controller
- `can_access`: admin/owner always True; otherwise checks intersection of user's accessible departments with app's published departments
- Diff-based update: only INSERT new / DELETE removed, avoiding unnecessary writes
- Audit logs: separate `publish_app_to_departments` and `unpublish_app_from_departments` actions with department ID lists

## Commits
Pending commit.
