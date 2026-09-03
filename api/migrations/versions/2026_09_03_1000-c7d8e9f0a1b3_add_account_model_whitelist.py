"""add account_model_whitelist table

Revision ID: c7d8e9f0a1b3
Revises: b3e5f7a9c1d2
Create Date: 2026-09-03 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

import models.types

revision: str = "c7d8e9f0a1b3"
down_revision: str | None = "b3e5f7a9c1d2"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.create_table(
        "account_model_whitelist",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
        sa.Column("account_id", models.types.StringUUID(), nullable=False),
        sa.Column("provider_name", sa.String(255), nullable=False),
        sa.Column("model_name", sa.String(255), nullable=False),
        sa.Column("model_type", sa.String(255), nullable=False),
        sa.Column("created_by", models.types.StringUUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="account_model_whitelist_pkey"),
        sa.UniqueConstraint("account_id", "provider_name", "model_name", "model_type", name="unique_account_model"),
    )
    with op.batch_alter_table("account_model_whitelist", schema=None) as batch_op:
        batch_op.create_index("account_model_whitelist_account_idx", ["account_id"], unique=False)
        batch_op.create_index("account_model_whitelist_tenant_idx", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_table("account_model_whitelist")
