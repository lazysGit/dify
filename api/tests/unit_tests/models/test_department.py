from models.department import Department


def test_department_tablename_and_columns():
    assert Department.__tablename__ == "departments"
    cols = Department.__table__.columns.keys()
    for expected in (
        "id",
        "tenant_id",
        "parent_id",
        "name",
        "description",
        "path",
        "level",
        "sort_order",
        "is_default",
        "created_by",
        "created_at",
        "updated_at",
        "updated_by",
    ):
        assert expected in cols


def test_department_root_name_unique_index():
    idx = {i.name for i in Department.__table__.indexes}
    assert "unique_tenant_root_department_name" in idx
    assert "unique_tenant_default_department" in idx
    assert "department_path_idx" in idx
    assert "department_tenant_idx" in idx
    assert "department_parent_idx" in idx
    assert "unique_tenant_department_name" in {c.name for c in Department.__table__.constraints}


def test_tenant_account_join_department_columns():
    from models.account import TenantAccountJoin

    cols = TenantAccountJoin.__table__.columns.keys()
    assert "department_id" in cols
    assert "is_department_admin" in cols
    idx = {i.name for i in TenantAccountJoin.__table__.indexes}
    assert "tenant_account_join_department_id_idx" in idx
    admin_col = TenantAccountJoin.__table__.columns["is_department_admin"]
    assert admin_col.server_default is not None


def test_app_department_column():
    from models.model import App

    cols = App.__table__.columns.keys()
    assert "department_id" in cols
    idx = {i.name for i in App.__table__.indexes}
    assert "app_department_id_idx" in idx


def test_dataset_department_column():
    from models.dataset import Dataset

    cols = Dataset.__table__.columns.keys()
    assert "department_id" in cols
    idx = {i.name for i in Dataset.__table__.indexes}
    assert "dataset_department_id_idx" in idx


def test_app_published_department_tablename_and_columns():
    from models.department import AppPublishedDepartment

    assert AppPublishedDepartment.__tablename__ == "app_published_departments"
    cols = AppPublishedDepartment.__table__.columns.keys()
    for expected in ("id", "app_id", "department_id", "published_by", "created_at"):
        assert expected in cols


def test_app_published_department_constraints_and_indexes():
    from models.department import AppPublishedDepartment

    constraints = {c.name for c in AppPublishedDepartment.__table__.constraints}
    assert "app_published_department_pkey" in constraints
    assert "unique_app_department" in constraints
    idx = {i.name for i in AppPublishedDepartment.__table__.indexes}
    assert "app_published_department_app_id_idx" in idx
    assert "app_published_department_department_id_idx" in idx
