# Backend API Routers - FastAPI Endpoints

**Generated:** 2026-04-13

## OVERVIEW
FastAPI routers with `/api/v1` prefix, Pydantic validation, RBAC, and SDUI response pattern.

## WHERE TO LOOK
| Router | File | Endpoints |
|--------|------|-----------|
| auth | `auth.py` | Login, logout, token refresh, user info |
| user | `user.py` | User CRUD, role assignment |
| role | `role.py` | Role CRUD, permission assignment |
| permission | `permission.py` | Permission CRUD |
| cdisc | `cdisc*.py` | CDISC sync, standards management |
| study-spec | `study_spec.py` | Study specification CRUD |
| tfl | `tfl*.py` | TFL config, mock shell generation |
| pipeline | `pipeline*.py` | PR workflow, stages, roles |
| mapping | `mapping*.py` | SDR mapping studio |
| reference-data | `reference_data.py` | Reference data management |

## CONVENTIONS
- **Prefix**: All routers mount under `/api/v1`
- **Schema**: Pydantic v2 for request/response validation
- **RBAC**: Dependency injection for role/permission checks
- **Visibility**: Inject `visibility_context` in all metadata queries
- **SDUI**: Return `{data: [...], schema: {fields: [...], i18n_keys: {...}}}`
- **Async**: All endpoints async, use async SQLAlchemy session

## ANTI-PATTERNS
- **NEVER** skip RBAC dependency - all metadata endpoints need auth
- **NEVER** skip `visibility_context` - prevents blind-state leakage
- **NEVER** return raw data only - include schema for SDUI
- **NEVER** use sync SQLAlchemy - all queries async