"""add app_published_departments

Revision ID: b3e5f7a9c1d2
Revises: 9f2c8d4e6a1b
Create Date: 2026-08-26 11:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

import models.types

revision: str = "b3e5f7a9c1d2"
down_revision: str | None = "9f2c8d4e6a1b"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_published_departments",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("app_id", models.types.StringUUID(), nullable=False),
        sa.Column("department_id", models.types.StringUUID(), nullable=False),
        sa.Column("published_by", models.types.StringUUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="app_published_department_pkey"),
        sa.UniqueConstraint("app_id", "department_id", name="unique_app_department"),
    )
    with op.batch_alter_table("app_published_departments", schema=None) as batch_op:
        batch_op.create_index("app_published_department_app_id_idx", ["app_id"], unique=False)
        batch_op.create_index("app_published_department_department_id_idx", ["department_id"], unique=False)

    conn = op.get_bind()
    conn.execute(
        sa.text("""
        INSERT INTO app_published_departments (id, app_id, department_id, published_by, created_at)
        SELECT uuid_generate_v4(), a.id, a.department_id, a.created_by, NOW()
        FROM apps a
        WHERE a.enable_site = true AND a.department_id IS NOT NULL AND a.status = 'normal'
        ON CONFLICT (app_id, department_id) DO NOTHING
    """)
    )


def downgrade() -> None:
    op.drop_table("app_published_departments")
