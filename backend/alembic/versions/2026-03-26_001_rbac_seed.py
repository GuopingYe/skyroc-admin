"""rbac seed data + schema fixes

Revision ID: rbac_seed_001
Revises: rbac_init
Create Date: 2026-03-26 00:00:00.000000+00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "rbac_seed_001"
down_revision: Union[str, None] = "234ed8f6a5d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROLES = [
    ("SUPER_ADMIN", "Super Admin", "Full platform access", 100, "purple"),
    ("TA_HEAD", "TA Head", "Therapeutic Area oversight", 80, "blue"),
    ("COMPOUND_LEAD", "Compound Lead", "Compound-level management", 70, "cyan"),
    ("LINE_MANAGER", "Line Manager", "Resource assignment manager", 65, "orange"),
    ("STUDY_LEAD_PROG", "Study Lead Programmer", "Lead programmer for a study", 60, "green"),
    ("STUDY_PROG", "Study Programmer", "Programmer on a study", 40, "lime"),
    ("QC_REVIEWER", "QC Reviewer", "Quality control reviewer", 35, "gold"),
    ("STATISTICIAN", "Statistician", "Statistical analysis and TFL shells", 30, "volcano"),
    ("VIEWER", "Viewer", "Read-only access", 10, "default"),
]

PERMISSIONS = [
    ("page:global-library:view", "View Global Library", "CDISC Global Library page", "page", 10),
    ("page:study-spec:view", "View Study Spec", "Study Specification page", "page", 20),
    ("page:mapping-studio:view", "View Mapping Studio", "Mapping Studio page", "page", 30),
    ("page:tfl-designer:view", "View TFL Designer", "TFL Designer page", "page", 40),
    (
        "page:tfl-template-library:view",
        "View TFL Template Library",
        "TFL Template Library page",
        "page",
        50,
    ),
    ("page:pipeline-management:view", "View Pipeline Management", "Pipeline Management page", "page", 60),
    ("page:pr-approval:view", "View PR Approval", "PR Approval page", "page", 70),
    ("page:programming-tracker:view", "View Programming Tracker", "Programming Tracker page", "page", 80),
    ("page:tracker:view", "View Tracker", "Tracker & Issues page", "page", 90),
    ("page:user-management:view", "View User Management", "User Management admin page", "page", 100),
    (
        "page:role-permission:view",
        "View Role Permission Config",
        "Role & Permission Config admin page",
        "page",
        110,
    ),
    ("global-library:edit", "Edit Global Library", "Edit CDISC standard library entries", "metadata", 10),
    ("study-spec:edit", "Edit Study Spec", "Edit study specification config", "metadata", 20),
    ("mapping:edit", "Edit Mapping", "Create/edit SDTM/ADaM mapping rules", "metadata", 30),
    ("mapping:delete", "Delete Mapping", "Soft-delete mapping rules (audit-logged)", "metadata", 40),
    ("tfl:edit", "Edit TFL", "Create/edit TFL outputs in designer", "tfl", 10),
    ("tfl-template:edit", "Edit TFL Template", "Create/edit TFL shell templates", "tfl", 20),
    ("pipeline:edit", "Edit Pipeline", "Edit pipeline milestones and timelines", "project", 10),
    (
        "pipeline:assign-team",
        "Assign Pipeline Team",
        "Assign users to study roles (delegated admin)",
        "project",
        20,
    ),
    ("tracker:edit", "Edit Tracker", "Edit/close tracker items", "project", 30),
    ("tracker:assign", "Assign Tracker", "Assign tracker tasks to users", "project", 40),
    ("issues:edit", "Edit Issues", "Create/edit issues within /mdr/tracker", "project", 50),
    ("pr:submit", "Submit PR", "Submit a pull request for review", "qc", 10),
    ("pr:approve", "Approve PR", "Approve a pull request", "qc", 20),
    ("pr:reject", "Reject PR", "Reject a pull request", "qc", 30),
    ("user:create", "Create User", "Create a new local user account", "admin", 10),
    ("user:edit", "Edit User", "Edit user profile", "admin", 20),
    ("user:deactivate", "Deactivate User", "Activate / deactivate a user account", "admin", 30),
    ("role:edit-permissions", "Edit Role Permissions", "Update which permissions a role has", "admin", 40),
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "SUPER_ADMIN": [permission[0] for permission in PERMISSIONS],
    "TA_HEAD": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pipeline-management:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "pipeline:edit",
        "pipeline:assign-team",
        "tracker:edit",
        "tracker:assign",
        "issues:edit",
        "pr:submit",
        "pr:approve",
        "pr:reject",
    ],
    "COMPOUND_LEAD": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pipeline-management:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "pipeline:edit",
        "pipeline:assign-team",
        "tracker:edit",
        "tracker:assign",
        "issues:edit",
        "pr:submit",
        "pr:approve",
        "pr:reject",
    ],
    "LINE_MANAGER": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pipeline-management:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "pipeline:edit",
        "pipeline:assign-team",
        "tracker:edit",
        "tracker:assign",
        "issues:edit",
    ],
    "STUDY_LEAD_PROG": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pipeline-management:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "study-spec:edit",
        "mapping:edit",
        "mapping:delete",
        "tfl:edit",
        "tfl-template:edit",
        "pipeline:edit",
        "tracker:edit",
        "tracker:assign",
        "issues:edit",
        "pr:submit",
        "pr:approve",
        "pr:reject",
    ],
    "STUDY_PROG": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "study-spec:edit",
        "mapping:edit",
        "tfl:edit",
        "tfl-template:edit",
        "tracker:edit",
        "issues:edit",
        "pr:submit",
    ],
    "QC_REVIEWER": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "issues:edit",
        "pr:approve",
        "pr:reject",
    ],
    "STATISTICIAN": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:programming-tracker:view",
        "page:tracker:view",
        "tfl:edit",
        "tfl-template:edit",
    ],
    "VIEWER": [
        "page:global-library:view",
        "page:study-spec:view",
        "page:mapping-studio:view",
        "page:tfl-designer:view",
        "page:tfl-template-library:view",
        "page:pr-approval:view",
        "page:programming-tracker:view",
        "page:tracker:view",
    ],
}


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "auth_provider",
            sa.String(length=20),
            nullable=False,
            server_default="LOCAL",
            comment="Auth provider: LOCAL | LDAP",
        ),
    )

    op.add_column(
        "user_scope_roles",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("user_scope_roles", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_scope_roles", sa.Column("deleted_by", sa.String(), nullable=True))

    op.drop_constraint("uq_user_scope_role", "user_scope_roles", type_="unique")
    op.create_index(
        "uq_user_scope_role_active",
        "user_scope_roles",
        ["user_id", "scope_node_id", "role_id"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index("ix_user_scope_roles_is_deleted", "user_scope_roles", ["is_deleted"])

    conn = op.get_bind()

    for code, name, description, sort_order, color in ROLES:
        conn.execute(
            sa.text(
                """
                INSERT INTO roles (code, name, description, sort_order, color, is_system, created_by)
                VALUES (:code, :name, :description, :sort_order, :color, TRUE, 'system')
                ON CONFLICT (code) DO UPDATE
                SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    sort_order = EXCLUDED.sort_order,
                    color = EXCLUDED.color
                """
            ),
            {
                "code": code,
                "name": name,
                "description": description,
                "sort_order": sort_order,
                "color": color,
            },
        )

    for code, name, description, category, sort_order in PERMISSIONS:
        conn.execute(
            sa.text(
                """
                INSERT INTO permissions (code, name, description, category, sort_order)
                VALUES (:code, :name, :description, :category, :sort_order)
                ON CONFLICT (code) DO UPDATE
                SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    sort_order = EXCLUDED.sort_order
                """
            ),
            {
                "code": code,
                "name": name,
                "description": description,
                "category": category,
                "sort_order": sort_order,
            },
        )

    conn.execute(
        sa.text(
            """
            DELETE FROM role_permissions
            WHERE role_id IN (
                SELECT id FROM roles WHERE code = ANY(:role_codes)
            )
            """
        ),
        {"role_codes": [role[0] for role in ROLES]},
    )

    for role_code, permission_codes in ROLE_PERMISSIONS.items():
        for permission_code in permission_codes:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT roles.id, permissions.id
                    FROM roles, permissions
                    WHERE roles.code = :role_code AND permissions.code = :permission_code
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"role_code": role_code, "permission_code": permission_code},
            )


def downgrade() -> None:
    conn = op.get_bind()

    for role_code, permission_codes in ROLE_PERMISSIONS.items():
        for permission_code in permission_codes:
            conn.execute(
                sa.text(
                    """
                    DELETE FROM role_permissions
                    WHERE (role_id, permission_id) IN (
                        SELECT roles.id, permissions.id
                        FROM roles, permissions
                        WHERE roles.code = :role_code AND permissions.code = :permission_code
                    )
                    """
                ),
                {"role_code": role_code, "permission_code": permission_code},
            )

    for code, *_rest in reversed(PERMISSIONS):
        conn.execute(sa.text("DELETE FROM permissions WHERE code = :code"), {"code": code})

    for code, *_rest in reversed(ROLES):
        conn.execute(sa.text("DELETE FROM roles WHERE code = :code"), {"code": code})

    op.drop_index("uq_user_scope_role_active", table_name="user_scope_roles")
    op.drop_index("ix_user_scope_roles_is_deleted", table_name="user_scope_roles")
    op.create_unique_constraint("uq_user_scope_role", "user_scope_roles", ["user_id", "scope_node_id", "role_id"])

    op.drop_column("user_scope_roles", "deleted_by")
    op.drop_column("user_scope_roles", "deleted_at")
    op.drop_column("user_scope_roles", "is_deleted")
    op.drop_column("users", "auth_provider")
