# Backend - Clinical MDR FastAPI Application

**Generated:** 2026-04-13
**Commit:** 6d6d1551
**Branch:** main

## OVERVIEW
Python 3.11+ FastAPI backend for Clinical MDR platform with SQLAlchemy 2.0 async, PostgreSQL, Alembic migrations.

## STRUCTURE
```
backend/
├── app/
│   ├── models/        # SQLAlchemy ORM models (soft delete + audit trail)
│   ├── api/routers/   # FastAPI route handlers (/api/v1 prefix)
│   ├── schemas/       # Pydantic request/response schemas
│   ├── services/      # Business logic layer
│   ├── core/          # Config, security, dependencies
│   └── main.py        # FastAPI app entry point
├── tests/             # pytest tests (unit, integration, slow markers)
├── alembic/           # Database migrations
└── docker-compose.yml # PostgreSQL 15 + pgAdmin
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add model | `app/models/` | Soft delete pattern, audit trail via event listeners |
| Add API endpoint | `app/api/routers/` | Pydantic schemas, RBAC check, visibility_context |
| Add schema | `app/schemas/` | Request/Response Pydantic v2 models |
| Add service | `app/services/` | Business logic, async SQLAlchemy queries |
| Add migration | `alembic/versions/` | `alembic revision -m "msg"` |
| Add test | `tests/` | Pattern: `test_*.py`, markers: unit, integration, slow |
| Add config | `app/core/config.py` | Environment variables, Pydantic BaseSettings |

## CONVENTIONS
- **Async**: All SQLAlchemy queries async, `asyncpg` for PostgreSQL, `aiosqlite` for tests
- **API prefix**: `/api/v1`
- **Auth**: JWT via `python-jose`, password hashing via `passlib[bcrypt]`
- **SDUI**: APIs return `{data, schema}` with i18n keys for frontend dynamic rendering
- **JSONB**: Use PostgreSQL JSONB for vendor/eDT/TFL complex configurations
- **Tree hierarchy**: `CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis`
- **Version locking**: `pinned_version` field for Analysis inheritance

## ANTI-PATTERNS (CRITICAL)
- **NEVER** use `DELETE` for core metadata - soft delete only (`is_deleted` flag)
- **NEVER** skip audit trail - SQLAlchemy event listeners must log all changes
- **NEVER** skip `visibility_context` injection - prevents blind-state data leakage
- **NEVER** hardcode values - use environment variables or config
- **NEVER** proceed without design approval for core table restructuring

## COMMANDS
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080  # Dev server
pytest                                                      # Run all tests
pytest -v --tb=short                                        # Verbose output
pytest -m unit                                              # Unit tests only
pytest -m integration                                       # Integration tests only
pytest --cov                                                # With coverage (40% threshold)
pytest tests/test_file.py                                   # Single test file
pytest tests/test_file.py::test_function                   # Single test function
alembic upgrade head                                        # Apply all migrations
alembic revision -m "msg"                                   # Create new migration
```

## NOTES
- Backend runs on port 8080
- Coverage threshold: 40% minimum
- Test markers: `unit` (no external deps), `integration` (requires DB), `slow`
- Docker: PostgreSQL 15 + pgAdmin via `docker-compose.yml`
- Pre-commit: Ruff linting with `--fix` and `ruff-format`