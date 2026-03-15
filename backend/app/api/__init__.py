"""API package"""
from app.api.routers.mapping_studio import router as mapping_studio_router

__all__ = [
    "mapping_studio_router",
]