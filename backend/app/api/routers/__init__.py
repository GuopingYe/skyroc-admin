"""Routers package"""
from app.api.routers.admin_sync import router as admin_sync_router
from app.api.routers.ars_builder import router as ars_builder_router
from app.api.routers.auth import router as auth_router
from app.api.routers.global_library import router as global_library_router
from app.api.routers.mapping_studio import router as mapping_studio_router
from app.api.routers.pipeline import router as pipeline_router
from app.api.routers.pull_requests import router as pull_requests_router
from app.api.routers.rbac import rbac_router
from app.api.routers.tracker import router as tracker_router

__all__ = [
    "mapping_studio_router",
    "tracker_router",
    "ars_builder_router",
    "pull_requests_router",
    "admin_sync_router",
    "rbac_router",
    "global_library_router",
    "auth_router",
    "pipeline_router",
]