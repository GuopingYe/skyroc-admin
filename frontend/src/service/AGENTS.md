# Frontend Service Layer - API Architecture

**Generated:** 2026-04-13

## OVERVIEW
Elegant分层架构 for API calls: URL constants, Query keys, fetch functions, React Query hooks, types.

## WHERE TO LOOK
| Task | Subdirectory | Notes |
|------|--------------|-------|
| Add URL constant | `urls/` | Pattern: `MODULE_URLS = { ENDPOINT: '/path' } as const` |
| Add Query key | `keys/` | Pattern: `QUERY_KEYS.MODULE.KEY = ['module', 'key'] as const` |
| Add fetch function | `api/` | Pattern: `fetchXxx(params) => request<Type>({...})` |
| Add Query hook | `hooks/` | Pattern: `useXxx() => useQuery/useMutation({...})` |
| Add type | `types/` | Pattern: `namespace Api.Module { interface XxxParams {...} }` |
| Configure request | `request/` | `@sa/axios` instance, interceptors, error handling |

## CONVENTIONS
- **URLs**: `PascalCase_URLS` suffix, centralized in `urls/index.ts`
- **Keys**: `QUERY_KEYS` root object, module nesting, `as const` for type safety
- **Functions**: `fetch` prefix, return `Promise<Api.Module.Response>`
- **Hooks**: `use` prefix, combine fetch + keys, export from `hooks/index.ts`
- **Types**: `Api.*` namespace, request params + response interfaces
- **Request**: Use `request` from `@sa/axios`, never raw axios

## ANTI-PATTERNS
- **NEVER** hardcode URLs in components - use `*_URLS`
- **NEVER** hardcode Query keys - use `QUERY_KEYS`
- **NEVER** use `any` in types - use `unknown` or specific interfaces
- **NEVER** skip type definition before implementing API
- **NEVER** call `request` directly in components - use hooks