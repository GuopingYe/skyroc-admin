# Eval 2: Commit Everything — NEW Skill Simulation

## Skill Used
New commit command with monorepo awareness, temp file cleanup, and split detection.

## Simulated Workflow

### Phase 1 — Gather Context
Runs in parallel:
- `git status --short` → 4 modified (2 backend, 2 frontend), 2 untracked (`backend/sedXYZ123`, `docs/notes.md`)
- `git diff HEAD` → sees scope children feature (backend: model + router, frontend: component + hook)
- `git log --oneline -10` → sees conventional commit history with scopes
- `git branch --show-current` → `feature/scope-children`

**Cleanup**: Finds `backend/sedXYZ123` (matches `sed*` pattern). Deletes it.
"Cleaned up temp file: backend/sedXYZ123"

### Phase 2 — Determine Scope & Staging
User said "everything" (empty target interpretation → stage all modified/tracked).

**Monorepo split detection**: Both `backend/` and `frontend/` have meaningful changes:
- Backend: 2 files (model: `get_children_ordered`, router: new endpoint)
- Frontend: 2 files (ScopeTree: children query, useScopeTree: new hook)

These are NOT trivially coupled — the backend adds an endpoint, the frontend consumes it. They represent different layers of the same feature but are in different directories.

**Action**: Suggest splitting to the user:
> "Both sides have changes. Commit separately (recommended) or bundle into one?
>
> Backend: 2 files — `scope_node.py` (model: ordered children), `scope.py` (router: children endpoint)
> Frontend: 2 files — `ScopeTree.tsx` (component: children display), `useScopeTree.ts` (hook: children query)
>
> There's also an untracked `docs/notes.md` — include it?"

Assuming user confirms split:

**Backend commit:**
```bash
git add backend/app/models/scope_node.py backend/app/api/routers/scope.py
```

**Frontend commit:**
```bash
git add frontend/src/features/scope/ScopeTree.tsx frontend/src/features/scope/useScopeTree.ts
```

### Phase 3 — Pre-commit Checks

Backend:
```bash
cd d:/github/clinical-mdr/backend && ruff check app/ --quiet 2>&1 | head -30
```

Frontend:
```bash
cd d:/github/clinical-mdr/frontend && npx tsc --noEmit 2>&1 | tail -20
```

Both pass.

### Phase 4 — Craft Commit Messages

**Backend commit:**
```
feat(backend): add scope children endpoint with ordered retrieval
```

**Frontend commit:**
```
feat(frontend): integrate scope children query in tree component
```

Both follow conventional commits with appropriate scopes.

### Phase 5 — Commit

```bash
# Backend
git add backend/app/models/scope_node.py backend/app/api/routers/scope.py
git commit -m "$(cat <<'EOF'
feat(backend): add scope children endpoint with ordered retrieval

Add get_children_ordered method to ScopeNode model and expose
via GET /scope/{id}/children endpoint for ordered child retrieval.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Frontend
git add frontend/src/features/scope/ScopeTree.tsx frontend/src/features/scope/useScopeTree.ts
git commit -m "$(cat <<'EOF'
feat(frontend): integrate scope children query in tree component

Add useScopeChildren hook and wire into ScopeTree component
for dynamic child node loading.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Phase 6 — Output
```
Committed: abc1234
Message:   feat(backend): add scope children endpoint with ordered retrieval
Files:     2 file(s) changed

Committed: def5678
Message:   feat(frontend): integrate scope children query in tree component
Files:     2 file(s) changed

Next steps:
  - git push                    → push to remote
  - /commit-push-pr             → push and create a PR
```

### Strengths over old skill
- Monorepo split: separate commits for backend/frontend (per CLAUDE.md)
- Cleans up `sedXYZ123` temp file
- Pre-commit checks: ruff for backend, tsc for frontend
- Conventional commits with correct scopes
- Asks about `docs/notes.md` untracked file
- Co-Authored-By trailers
- Structured output showing both commits
