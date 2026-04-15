"""fix_ct_scope_node_names

Repair CT scope node names to be distinguishable by package type.

Before this migration every CT package for the same date shared the same
name, e.g. all five 2026-03-27 nodes were named "CDISC CT 2026-03-27".

After this migration each node carries the CT package type in its name:
  CDISC-CT-sdtmct-2026-03-27  → "CDISC SDTM CT 2026-03-27"
  CDISC-CT-adamct-2026-03-27  → "CDISC ADaM CT 2026-03-27"
  CDISC-CT-sendct-2026-03-27  → "CDISC SEND CT 2026-03-27"
  etc.

Also soft-deletes the orphaned CDISC-CT-latest sentinel node that was
created when version='latest' was passed during early testing.

Revision ID: fix_ct_names_001
Revises: d979e393722a
Create Date: 2026-04-15
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'fix_ct_names_001'
down_revision: Union[str, None] = 'd979e393722a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix all CT scope node names that contain a known package prefix.
    # The code column follows the pattern CDISC-CT-{prefix}-{YYYY-MM-DD}.
    # We extract the date with a regex and prepend the human-readable type label.
    op.execute("""
        UPDATE scope_nodes
        SET name = CASE
            WHEN code LIKE 'CDISC-CT-sdtmct-%'
                THEN 'CDISC SDTM CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-adamct-%'
                THEN 'CDISC ADaM CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-sendct-%'
                THEN 'CDISC SEND CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-cdashct-%'
                THEN 'CDISC CDASH CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-ddfct-%'
                THEN 'CDISC DDF CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-define-xmlct-%'
                THEN 'CDISC Define-XML CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-define-%'
                THEN 'CDISC Define-XML CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-protocolct-%'
                THEN 'CDISC Protocol CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-glossaryct-%'
                THEN 'CDISC Glossary CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-tmfct-%'
                THEN 'CDISC TMF CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-mrctct-%'
                THEN 'CDISC mRCT CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-coact-%'
                THEN 'CDISC CoA CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-qrsct-%'
                THEN 'CDISC QRS CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-qs-ft-%'
                THEN 'CDISC QS-FT CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            WHEN code LIKE 'CDISC-CT-qs-%'
                THEN 'CDISC QS CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
            ELSE name
        END,
        description = 'CDISC 官方 CT 标准，版本 ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
        WHERE code LIKE 'CDISC-CT-%'
          AND code ~ '\\d{4}-\\d{2}-\\d{2}$'
          AND is_deleted = false
    """)

    # Soft-delete the orphaned "CDISC-CT-latest" sentinel node created during
    # early testing when version='latest' was passed directly into the sync.
    op.execute("""
        UPDATE scope_nodes
        SET is_deleted = true,
            deleted_at = now(),
            deleted_by = 'ct_naming_fix_migration'
        WHERE code = 'CDISC-CT-latest'
          AND is_deleted = false
    """)


def downgrade() -> None:
    # Revert names back to the broken "CDISC CT {date}" format.
    # Note: the CDISC-CT-latest soft-delete is not reversed — it was an orphan.
    op.execute("""
        UPDATE scope_nodes
        SET name = 'CDISC CT ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$'),
            description = 'CDISC 官方 CT 标准，版本 ' || substring(code from '\\d{4}-\\d{2}-\\d{2}$')
        WHERE code LIKE 'CDISC-CT-%'
          AND code ~ '\\d{4}-\\d{2}-\\d{2}$'
          AND is_deleted = false
    """)
