from models.department import Department


def test_department_tablename_and_columns():
    assert Department.__tablename__ == "departments"
    cols = Department.__table__.columns.keys()
    for expected in ("id", "tenant_id", "parent_id", "name", "description", "path",
                     "level", "sort_order", "is_default", "created_by", "created_at", "updated_at", "updated_by"):
        assert expected in cols


def test_department_root_name_unique_index():
    idx = {i.name for i in Department.__table__.indexes}
    assert "unique_tenant_root_department_name" in idx
    assert "unique_tenant_default_department" in idx
    assert "department_path_idx" in idx
    assert "department_tenant_idx" in idx
    assert "department_parent_idx" in idx
    assert "unique_tenant_department_name" in {c.name for c in Department.__table__.constraints}
