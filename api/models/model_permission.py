"""Account-level model whitelist ORM models.

Tenant-scoped configuration table backing the model permission feature: rows
present for an account restrict that member to exactly those (provider, model,
model_type) combinations; absence of rows means "no restriction" (all system
models available). Owners/admins are never filtered regardless of rows.

Consumed by ``services.model_permission_service.ModelPermissionService``; the
table itself is intentionally small and has no dedicated repository layer
(matching the ``DepartmentService`` precedent in ``api/AGENTS.md``).
"""

from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import TypeBase
from .types import StringUUID


class AccountModelWhitelist(TypeBase):
    """One allowed (provider_name, model_name, model_type) triple for a member.

    Invariant: uniqueness is enforced per (account_id, provider_name,
    model_name, model_type) so a whitelist never contains duplicates; "no
    rows for this account" is the explicit "unrestricted" state.
    """

    __tablename__ = "account_model_whitelist"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="account_model_whitelist_pkey"),
        sa.UniqueConstraint("account_id", "provider_name", "model_name", "model_type", name="unique_account_model"),
        sa.Index("account_model_whitelist_account_idx", "account_id"),
        sa.Index("account_model_whitelist_tenant_idx", "tenant_id"),
    )

    id: Mapped[str] = mapped_column(
        StringUUID, insert_default=lambda: str(uuid4()), default_factory=lambda: str(uuid4()), init=False
    )
    tenant_id: Mapped[str] = mapped_column(StringUUID)
    account_id: Mapped[str] = mapped_column(StringUUID)
    provider_name: Mapped[str] = mapped_column(String(255))
    model_name: Mapped[str] = mapped_column(String(255))
    model_type: Mapped[str] = mapped_column(String(255))
    created_by: Mapped[str] = mapped_column(StringUUID)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False, init=False
    )
