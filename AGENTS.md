# AGENTS.md - Clinical MDR Platform

Clinical Metadata Repository (MDR) Platform for pharmaceutical/clinical trial data management.
Monorepo: `backend/` (Python FastAPI) + `frontend/` (React 19 + TypeScript + Vite).

## Build / Lint / Test Commands

### Root (run from repo root)
```bash
pnpm dev           # Start both backend (8080) and frontend (9527) via PowerShell
pnpm build         # Production build (frontend)
pnpm typecheck     # TypeScript type check
pnpm lint          # ESLint (frontend)
pnpm e2e           # Playwright E2E tests
```

### Frontend (run from `frontend/`)
```bash
pnpm dev                    # Dev server (mode: test)
pnpm build                  # Production build
pnpm typecheck              # tsc --noEmit --skipLibCheck
pnpm lint                   # ESLint with auto-fix
pnpm test                   # Vitest (watch mode)
pnpm test:run               # Vitest (single run)
pnpm test:coverage          # Vitest with coverage
pnpm test <file-pattern>    # Run a single test file, e.g. pnpm test use-auth.test.ts
pnpm e2e                    # Playwright E2E tests
pnpm gen-route              # Regenerate file-system routes from src/pages
pnpm commit                 # Conventional commit via CLI
```

### Backend (run from `backend/`)
```bash
pytest                      # Run all tests
pytest -v --tb=short        # Verbose output
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest --cov                # With coverage
pytest tests/test_file.py   # Run a single test file
pytest tests/test_file.py::test_function  # Run a single test function

python -m uvicorn app.main:app --host 127.0.0.1 --port 8080  # Dev server
alembic upgrade head        # Apply all migrations
alembic revision -m "msg"   # Create new migration
```

### Pre-commit Hooks
- **Frontend**: `simple-git-hooks` runs `pnpm typecheck` on pre-commit, validates commit messages
- **Root**: `.pre-commit-config.yaml` runs gitleaks, ruff (Python), ESLint (JS/TS)
- Run manually: `pre-commit run --all-files`

## Code Style - Frontend (TypeScript/React)

### Imports & Formatting
- Use `pnpm` only; never mix npm/yarn. Workspace deps via `workspace:*`
- Path aliases: `@/*` -> `./src/*`, `~/*` -> `./*`
- Import order: builtin -> external -> internal -> parent -> sibling -> index, alphabetized, newlines between groups
- ESLint: `@soybeanjs/eslint-config` with React, UnoCSS, sort plugins
- Prettier: `singleAttributePerLine: true`, `trailingCommas: 'none'`
- 2-space indentation, LF line endings, UTF-8

### TypeScript
- `strict: true`, `strictNullChecks: true`, `isolatedModules: true`
- **Never use `any`**; use `unknown`, specific interfaces, or generics
- Public types in `src/types` with `declare namespace App { ... }`
- API types in `src/service/types` under `Api.*` namespaces (e.g., `Api.Auth.LoginParams`)
- Use `satisfies` for constant validation (routes, theme tokens)
- Auto-generated types (`auto-imports.d.ts`) must not be manually edited

### Naming Conventions
- Directories: `kebab-case` (`user-center`, `global-header`)
- React components: `PascalCase.tsx` (`UserProfile.tsx`)
- Hooks/utils: `use-xxx.ts`, `storage.ts` (lowercase + hyphens/camelCase)
- Functions/variables/hooks: `camelCase` (`getThemeSettings`, `useAppSelector`)
- Components/classes/interfaces: `PascalCase` (`SystemLogo`, `ThemeSettings`)
- Constants: `SCREAMING_SNAKE_CASE` (`MAX_CACHE_COUNT`)
- API URL enums: `PascalCase` + `URLS` suffix (`AUTH_URLS`)
- Query keys: `QUERY_KEYS` root object + module name

### Component & API Patterns
- API functions: `fetch` prefix (`fetchLogin`, `fetchGetUserInfo`)
- Use `src/service/request` exported `request` (based on `@sa/axios`) for all API calls
- TanStack Query hooks: `useXxx` pattern with generic constraints
- React hooks must follow `useXxx` naming; allow destructured state
- Self-closing components for elements without children

### State Management
- Redux Toolkit for global state; `createAppSlice` wrapper
- Zustand for lightweight/feature-local state (colocated with features/pages)
- TanStack Query for server state

### Styling
- UnoCSS with `presetUno`, dark mode (class-based), custom presets
- Ant Design 5 for UI components
- CSS variables: `--color-name` format; UnoCSS shortcuts use `kebab-case`

### Routing
- File-system routes via `@soybean-react/vite-plugin-react-router`
- `(base)` = main layout, `(blank)` = simplified layout (login), `_builtin` = non-menu routes
- Dynamic params: `[id].tsx`, `[...all].tsx`
- Run `pnpm gen-route` after adding pages
- Export `handle` object for menu metadata (i18nKey, icon, order)

### Internationalization
- User-selectable CN/EN; new text goes in `src/locales` language packs
- Route/menu keys: `route.xxx`; page text: `page.xxx`, `common.xxx`

## Code Style - Backend (Python/FastAPI)

### Python
- Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2
- Linting: Ruff (via pre-commit) with `--fix` and `ruff-format`
- Async SQLAlchemy; use `asyncpg` for PostgreSQL, `aiosqlite` for tests

### API Patterns
- API prefix: `/api/v1`
- Pydantic schemas for request/response validation
- JWT authentication via `python-jose`; password hashing via `passlib[bcrypt]`

### Testing
- pytest with `asyncio_mode = auto`, strict markers
- Markers: `unit`, `integration`, `slow`
- In-memory SQLite for unit tests; Docker PostgreSQL for integration tests

## Core System Rules (Non-Negotiable)

1. **NO physical DELETE** for core metadata. Use soft delete with audit trail via SQLAlchemy event listeners.
2. **No hardcoding** - use environment variables or config files.
3. **RBAC + visibility_context**: All metadata queries must inject `visibility_context` filtering.
4. **Metadata-driven (SDUI)**: APIs return Data + Schema (with i18n keys); frontend renders dynamically.
5. **Tree hierarchy**: `CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis` with `pinned_version`.
6. **JSONB for flexibility**: Use PostgreSQL JSONB for complex vendor/eDT/TFL configurations.
7. **Ask before major changes**: Stop and propose设计方案 for core table restructuring or complex dependencies.

## Git Workflow
- Separate commits for backend and frontend changes
- Run linting and type checks before committing
- Use conventional commits (`pnpm commit`)
- Clean up `.tmp` and `sed*` temp files before committing

## Environment
- Frontend: port 9527 (dev), port 5173 (alternative config)
- Backend: port 8080
- API prefix: `/api/v1`
- Docker: PostgreSQL 15 + pgAdmin (`backend/docker-compose.yml`)
