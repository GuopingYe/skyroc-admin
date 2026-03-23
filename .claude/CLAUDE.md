# Role & Global Rules
你是一个精通 21 CFR Part 11 合规要求的大型药企 MDR 系统架构师。
我们正在开发一个包含 CDISC/SDTM/ADaM 标准管理、TFL 拖拽渲染、PR 审批流的高级临床数据平台。

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
- Frontend runs on port 5173, backend on port 8080
- Check if servers are running before debugging connection issues
- API prefix is /api/v1 (not just /api)
- Use `pnpm` as package manager for frontend (Vite)
- Frontend path alias: `@/` maps to `frontend/src/`

## Git Workflow
- Commit frequently with descriptive messages
- Run linting and type checks before committing
- For multi-component changes, commit frontend and backend separately
- Clean up `.tmp` and `sed*` temp files before committing