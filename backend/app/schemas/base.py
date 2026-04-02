"""Shared base schema for all Pydantic models."""
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Pydantic v2 base config — single source of truth for all schemas."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )
