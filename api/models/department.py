from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import TypeBase
from .types import LongText, StringUUID


class Department(TypeBase):
    __tablename__ = "departments"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="department_pkey"),
        sa.UniqueConstraint("tenant_id", "parent_id", "name", name="unique_tenant_department_name"),
        sa.Index(
            "unique_tenant_root_department_name",
            "tenant_id",
            "name",
            unique=True,
            postgresql_where=sa.text("parent_id IS NULL"),
        ),
        sa.Index(
            "unique_tenant_default_department",
            "tenant_id",
            unique=True,
            postgresql_where=sa.text("is_default"),
        ),
        sa.Index("department_tenant_idx", "tenant_id"),
        sa.Index("department_parent_idx", "parent_id"),
        sa.Index("department_path_idx", "path"),
    )

    id: Mapped[str] = mapped_column(
        StringUUID, insert_default=lambda: str(uuid4()), default_factory=lambda: str(uuid4()), init=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False, init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False, init=False, onupdate=func.current_timestamp()
    )
    tenant_id: Mapped[str] = mapped_column(StringUUID)
    name: Mapped[str] = mapped_column(String(255))
    path: Mapped[str] = mapped_column(String(1000))
    created_by: Mapped[str] = mapped_column(StringUUID)
    parent_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True, default=None)
    description: Mapped[str | None] = mapped_column(LongText, nullable=True, default=None)
    level: Mapped[int] = mapped_column(sa.Integer, server_default=sa.text("1"), default=1)
    sort_order: Mapped[int] = mapped_column(sa.Integer, server_default=sa.text("0"), default=0)
    is_default: Mapped[bool] = mapped_column(sa.Boolean, server_default=sa.text("false"), default=False)
    updated_by: Mapped[str | None] = mapped_column(StringUUID, nullable=True, default=None)


class AppPublishedDepartment(TypeBase):
    __tablename__ = "app_published_departments"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="app_published_department_pkey"),
        sa.UniqueConstraint("app_id", "department_id", name="unique_app_department"),
        sa.Index("app_published_department_app_id_idx", "app_id"),
        sa.Index("app_published_department_department_id_idx", "department_id"),
    )

    id: Mapped[str] = mapped_column(
        StringUUID, insert_default=lambda: str(uuid4()), default_factory=lambda: str(uuid4()), init=False
    )
    app_id: Mapped[str] = mapped_column(StringUUID)
    department_id: Mapped[str] = mapped_column(StringUUID)
    published_by: Mapped[str] = mapped_column(StringUUID)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False, init=False
    )
