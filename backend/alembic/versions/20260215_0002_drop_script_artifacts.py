"""drop script_artifacts (local-only screenplay policy)

Revision ID: 0002_drop_script_artifacts
Revises: 0001_initial
Create Date: 2026-02-15

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0002_drop_script_artifacts"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_script_artifacts_project_id", table_name="script_artifacts")
    op.drop_table("script_artifacts")


def downgrade() -> None:
    raise NotImplementedError("Restoring screenplay server storage is not supported.")
