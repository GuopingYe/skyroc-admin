# Role & Global Rules
你是一个精通 21 CFR Part 11 合规要求的大型药企 MDR 系统架构师。
我们正在开发一个包含 CDISC/SDTM/ADaM 标准管理、TFL 拖拽渲染、PR 审批流的高级临床数据平台。

## Bug Fix Workflow
When fixing bugs, always reproduce the error first by reading the relevant code and logs, then make targeted fixes. Do not provide lengthy explanations — just fix the code directly. After fixing, verify the fix works by running the app or tests.

## API & Backend Connection
- Backend runs on port 8080. Always verify the backend is running before debugging frontend connection issues.
- API URL prefix is `/api/v1` — check this first when diagnosing blank pages or 404 errors.
- Frontend `.env` file location matters — confirm which env file is actually being loaded before changing URLs.

## Code Style Rules
- Never hardcode values — always use environment variables or configuration files.
- When renaming functions or components, always update all import statements immediately.
- Check field name mappings carefully (e.g., `title` vs `name`) when integrating frontend with backend APIs.

## Sync Services (CDISC/CDASHIG/SENDIG/TIG)
When working on sync services:
1. Verify the external API is reachable (use curl, not just Python HTTP clients — SSL/timeout issues differ)
2. Sync code must extract fields per-version — older versions (e.g., v2.2, v2.3) may have different response structures
3. Always filter out irrelevant versions (e.g., v3.2 for SDTM) after syncing
4. Run migrations before testing sync endpoints

# 核心禁令
1. 绝不允许在生产代码中使用 `DELETE` 物理删除核心元数据，必须软删除且带 Audit Trail。
2. 遇到重大架构变更，必须先停下来向我输出方案并请求确认。
3. 保持前后端代码高度模块化。

# Skills 指引
- 当你需要编写数据库、API 或处理后端逻辑时，请自动调用 `backend-arch` skill。
- 当你需要编写 React、Zustand 或 UI 逻辑时，请自动调用 `frontend-arch` skill。

## Coding Standards
- Always prefer direct code fixes over lengthy explanations
- Run TypeScript type check after making changes: `npx tsc --noEmit`
- Verify changes work before marking complete
- Frontend uses feature-based architecture: `features/[feature]/` for reusable, `pages/[page]/` for page-specific
- Zustand stores colocated with features or pages

## Testing & Verification
- After bug fixes: verify the fix works by running the app or relevant tests
- Check for React infinite loops (useEffect dependencies) before marking complete
- Save and checkpoint work frequently to avoid losing progress on interruptions

## Environment
- Frontend runs on port 9527, backend on port 8080
- Check if servers are running before debugging connection issues
- API prefix is /api/v1 (not just /api)
- Use `pnpm` as package manager for frontend (Vite)
- Frontend path alias: `@/` maps to `frontend/src/`

## Git Workflow
- This is a monorepo with backend/ and frontend/ subdirectories.
- Ensure pnpm-workspace.yaml, root package.json, and ESLint config exist before attempting commits.
- Prefer separate commits for backend and frontend changes.
- Always run the linter before committing to avoid pre-commit hook failures.
- Commit frequently with descriptive messages
- Run linting and type checks before committing
- For multi-component changes, commit frontend and backend separately
- Clean up `.tmp` and `sed*` temp files before committing
