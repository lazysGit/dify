"""add department management

Revision ID: 9f2c8d4e6a1b
Revises: 6b5f9f8b1a2c
Create Date: 2026-08-26 10:00:00.000000

G9 偏离注释：默认部门回填仅覆盖"有成员的租户"（WHERE EXISTS）——空租户无成员可作 created_by（NOT NULL），
且其默认部门由 Task 5 的惰性创建兜底。
"""


import sqlalchemy as sa
from alembic import op

import models.types

revision: str = "9f2c8d4e6a1b"
down_revision: str | None = "6b5f9f8b1a2c"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
        sa.Column("parent_id", models.types.StringUUID(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", models.types.LongText(), nullable=True),
        sa.Column("path", sa.String(1000), nullable=False),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_by", models.types.StringUUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column("updated_by", models.types.StringUUID(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="department_pkey"),
        sa.UniqueConstraint("tenant_id", "parent_id", "name", name="unique_tenant_department_name"),
    )
    with op.batch_alter_table("departments", schema=None) as batch_op:
        batch_op.create_index("department_tenant_idx", ["tenant_id"], unique=False)
        batch_op.create_index("department_parent_idx", ["parent_id"], unique=False)
        batch_op.create_index("department_path_idx", ["path"], unique=False)
        batch_op.create_index(
            "unique_tenant_root_department_name",
            ["tenant_id", "name"],
            unique=True,
            postgresql_where=sa.text("parent_id IS NULL"),
        )
        batch_op.create_index(
            "unique_tenant_default_department",
            ["tenant_id"],
            unique=True,
            postgresql_where=sa.text("is_default"),
        )
    for table, idx in (
        ("tenant_account_joins", "tenant_account_join_department_id_idx"),
        ("apps", "app_department_id_idx"),
        ("datasets", "dataset_department_id_idx"),
    ):
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.add_column(sa.Column("department_id", models.types.StringUUID(), nullable=True))
            batch_op.create_index(idx, ["department_id"], unique=False)
    with op.batch_alter_table("tenant_account_joins", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("is_department_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False)
        )

    conn = op.get_bind()
    conn.execute(
        sa.text("""
        INSERT INTO departments
            (id, tenant_id, parent_id, name, path, level, is_default, created_by, created_at, updated_at)
        SELECT uuid_generate_v4(), t.id, NULL, '默认部门',
               '/' || t.id::text || '/' || uuid_generate_v4()::text, 1, true,
               (SELECT taj.account_id FROM tenant_account_joins taj
                 WHERE taj.tenant_id = t.id ORDER BY taj.created_at LIMIT 1),
               NOW(), NOW()
        FROM tenants t
        WHERE EXISTS (
            SELECT 1 FROM tenant_account_joins taj WHERE taj.tenant_id = t.id
        )
    """)
    )
    conn.execute(
        sa.text(
            "UPDATE departments SET path = '/' || tenant_id::text || '/' || id::text"
            " WHERE is_default = true"
        )
    )
    for table in ("tenant_account_joins", "apps", "datasets"):
        conn.execute(
            sa.text(f"""
            UPDATE {table} x SET department_id = d.id FROM departments d
            WHERE d.tenant_id = x.tenant_id AND d.is_default = true AND x.department_id IS NULL
        """)
        )


def downgrade() -> None:
    op.drop_table("departments")
    with op.batch_alter_table("tenant_account_joins", schema=None) as batch_op:
        batch_op.drop_column("is_department_admin")
        batch_op.drop_column("department_id")
    for table in ("apps", "datasets"):
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_column("department_id")
