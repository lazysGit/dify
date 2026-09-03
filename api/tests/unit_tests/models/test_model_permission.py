from models.model_permission import AccountModelWhitelist


def test_account_model_whitelist_tablename_and_columns():
    assert AccountModelWhitelist.__tablename__ == "account_model_whitelist"
    cols = AccountModelWhitelist.__table__.columns.keys()
    for expected in (
        "id",
        "tenant_id",
        "account_id",
        "provider_name",
        "model_name",
        "model_type",
        "created_by",
        "created_at",
    ):
        assert expected in cols


def test_account_model_whitelist_unique_constraint():
    constraints = {c.name for c in AccountModelWhitelist.__table__.constraints}
    assert "unique_account_model" in constraints
    indexes = {i.name for i in AccountModelWhitelist.__table__.indexes}
    assert "account_model_whitelist_account_idx" in indexes
    assert "account_model_whitelist_tenant_idx" in indexes
