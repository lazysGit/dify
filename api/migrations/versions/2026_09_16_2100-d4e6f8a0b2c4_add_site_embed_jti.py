"""add site embed_jti

Revision ID: d4e6f8a0b2c4
Revises: c7d8e9f0a1b3
Create Date: 2026-09-16 21:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision: str = "d4e6f8a0b2c4"
down_revision: str | None = "c7d8e9f0a1b3"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("sites", schema=None) as batch_op:
        batch_op.add_column(sa.Column("embed_jti", sa.String(length=36), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("sites", schema=None) as batch_op:
        batch_op.drop_column("embed_jti")
