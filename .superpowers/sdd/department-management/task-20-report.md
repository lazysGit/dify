# Task 20 Report: Explore Department Filter Backend + Switch

## Status: DONE

## Commits
- (pending commit)

## Test Summary
210 passed in explore/ test suite; config consistency test passes; 13 new tests for department app endpoint and publish-gated install.

## Changes Made

### Config (I4)
- `api/configs/feature/__init__.py`: Added `DepartmentConfig(BaseSettings)` with `DEPARTMENT_ACCESS_CONTROL_ENABLED: bool = False`; added to `FeatureConfig` mixin chain.
- `api/.env.example`: Added `DEPARTMENT_ACCESS_CONTROL_ENABLED=false`.
- `docker/.env.example`: Added `DEPARTMENT_ACCESS_CONTROL_ENABLED=false`.
- `docker/docker-compose.yaml`: Regenerated via `docker/generate_docker_compose`.

### Feature Service (I4)
- `api/services/feature_service.py`: Added `department_access_control: bool = False` to `SystemFeatureModel`; set from `dify_config.DEPARTMENT_ACCESS_CONTROL_ENABLED` in `_fulfill_system_params_from_env`.

### Department App Endpoint
- `api/controllers/console/explore/department_app.py`: New GET `/explore/department-apps` endpoint. Queries apps published to user's accessible departments (admin=all, dept admin=in-scope+descendants, member=own dept), filtered by `status='normal'` + `enable_site=true`, LEFT JOINs `installed_apps` for `is_installed`/`is_pinned`, sorts pinned first then by latest publish time desc.

### Installed App Controller
- `api/controllers/console/explore/installed_app.py`:
  - GET: When flag on, filters installed list to only apps published to user's accessible departments. Admin (accessible=None) sees all.
  - POST (R7): When flag on, relaxes install requirement from "RecommendedApp + is_public" to "app published to user's accessible departments". When flag off, zero behavior change.

### Tests
- `api/tests/unit_tests/controllers/console/explore/test_department_apps.py`: 13 tests covering three roles' visible sets, flag off no filter, unpublished not visible, cancel publish silent filter, systemFeatures exposes flag, R7 install allowed for published dept apps, unpublished install rejected.
- Updated existing `test_installed_app.py` to match new POST flow.

## Concerns
None. Flag defaults to False, ensuring zero behavior change when disabled.
