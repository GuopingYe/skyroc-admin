# Frontend Features - Domain Modules

**Generated:** 2026-04-13

## OVERVIEW
Feature-based architecture: self-contained modules with hooks, store, components, and exports.

## WHERE TO LOOK
| Feature | Directory | Purpose |
|---------|-----------|---------|
| auth | `auth/` | Login/logout, token management, user state |
| theme | `theme/` | Theme color, dark mode, layout settings |
| router | `router/` | Route state, cache routes, auth guards |
| menu | `menu/` | Menu state, active menu, collapse |
| tab | `tab/` | Tab management, tab cache, active tab |
| lang | `lang/` | i18n locale, language switching |
| tfl-designer | `tfl-designer/` | TFL drag-drop, table/figure/listing components |
| clinical-context | `clinical-context/` | Clinical data context, study selection |
| antdConfig | `antdConfig/` | Ant Design global config |
| animate | `animate/` | Motion animations |
| form | `form/` | Form utilities |
| table | `table/` | Table utilities |

## CONVENTIONS
- **Structure**: Each feature has `hooks/`, `store/` (optional), `components/`, `index.ts`
- **Export**: Single `index.ts` exports all public APIs
- **Redux**: Use `createAppSlice` for slices, export `selectors`, `actions`, `reducer`
- **Hooks**: Feature-local hooks in `hooks/`, use `use` prefix
- **Components**: Feature-specific components in `components/`

## ANTI-PATTERNS
- **NEVER** import internal feature files from other features - use `index.ts` exports
- **NEVER** duplicate global state in feature store - use Redux global
- **NEVER** skip `index.ts` export for new feature modules