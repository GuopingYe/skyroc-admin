# Backend Models - SQLAlchemy ORM

**Generated:** 2026-04-13

## OVERVIEW
SQLAlchemy 2.0 async models for Clinical MDR with soft delete and audit trail.

## WHERE TO LOOK
| Model Type | File Pattern | Notes |
|------------|--------------|-------|
| User/Auth | `user.py`, `role.py`, `permission.py` | RBAC, JWT tokens |
| Audit | `audit_log.py` | Event listener auto-populates |
| CDISC Standards | `cdisc_*.py` | SDTM, ADaM, CDASH, SEND standards |
| Study Spec | `study_spec*.py` | Study-level metadata |
| TFL Config | `tfl*.py` | JSONB for complex layouts |
| Pipeline | `pipeline*.py` | PR workflow, roles, stages |
| Mapping | `mapping*.py` | SDR mapping studio |
| Core | `base.py` | Soft delete mixin, audit mixin |

## CONVENTIONS
- **Soft delete**: `is_deleted` boolean flag, `deleted_at` timestamp
- **Audit trail**: SQLAlchemy event listeners auto-populate `created_by`, `updated_by`, `created_at`, `updated_at`
- **JSONB**: Use for vendor configs, eDT settings, TFL mock shell layouts
- **Tree hierarchy**: Parent-child FKs with `pinned_version` for version locking
- **Async**: All models use async SQLAlchemy session

## ANTI-PATTERNS
- **NEVER** add `DELETE` cascade - use soft delete
- **NEVER** skip audit mixin on core tables
- **NEVER** use plain TEXT for complex configs - use JSONB
- **NEVER** hardcode hierarchy levels - use configurable tree structure