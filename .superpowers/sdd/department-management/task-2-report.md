# Task 2 Report: Extend Existing Models with Department Fields

## Status
DONE

## Commits
- `239af53efa` feat(department): add department_id/is_department_admin columns

## Test summary
5 passed, 0 failed (28.59s)

## Changes
- `api/models/account.py`: Added `department_id` (nullable StringUUID) and `is_department_admin` (bool, server_default false) to `TenantAccountJoin`; added index `tenant_account_join_department_id_idx`
- `api/models/model.py`: Added `department_id` (nullable StringUUID) to `App`; added index `app_department_id_idx`
- `api/models/dataset.py`: Added `department_id` (nullable StringUUID) to `Dataset`; added index `dataset_department_id_idx`
- `api/tests/unit_tests/models/test_department.py`: Appended 3 test functions covering all new columns and indexes

## Concerns
None
