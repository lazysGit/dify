# Task 22: Chat URL Authentication

- Status: DONE
- Commits: (pending)
- Test summary: 258 backend tests pass (web dir regression), 7 frontend tests pass
- Concerns: None

## Changes

### Backend
- Created `api/controllers/web/chat_access.py`: GET `/api/chat-access/verify?app_code=...` endpoint with self-implemented auth via `extract_access_token` -> `PassportService().verify` -> `AppPublishService.can_access`
- Modified `api/controllers/web/passport.py`: Added department gate in `PassportResource.get` - when flag on, resolves console account, checks `can_access`, creates/reuses EndUser with `session_id=f"console:{account_id}"` and `is_anonymous=False`
- Modified `api/controllers/web/wraps.py`: Added R3 check in `decode_jwt_token` - flag on + `end_user.is_anonymous` -> 401, blocking all existing anonymous tokens
- Registered `chat_access` module in `api/controllers/web/__init__.py`
- Created `api/tests/unit_tests/controllers/console/test_chat_access_verify.py` (12 tests)
- Created `api/tests/unit_tests/controllers/web/test_passport_department_gate.py` (9 tests)
- Adapted `api/tests/unit_tests/controllers/web/test_wraps.py` (added 3 R3 tests, updated existing mocks with `department_access_control=False`)
- Adapted `api/tests/unit_tests/controllers/web/test_web_passport.py` (updated existing mocks)

### Frontend
- Created `web/app/(shareLayout)/components/chat-access-guard.tsx`: reads `systemFeatures.department_access_control.enabled`, calls `GET /api/chat-access/verify?app_code=` with `credentials: 'include'`, handles 401/403/200 responses
- Modified `web/app/(shareLayout)/components/splash.tsx`: wraps children with `ChatAccessGuard` when flag is on
- Added i18n keys to `web/i18n/en-US/share.json`: `common.accessDenied`, `common.returnToConsole`, `common.appNotFound`
- Created `web/__tests__/department/chat-access-guard.test.tsx` (7 tests)
