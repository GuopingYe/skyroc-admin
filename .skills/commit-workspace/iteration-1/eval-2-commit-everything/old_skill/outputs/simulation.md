# Eval 2: Commit Everything — OLD Skill Simulation

## Skill Used
Old skill: just "create a single git commit" with auto-populated context.

## Simulated Workflow

### 1. Context Gathered
Auto-populated git status showing 4 modified files (2 backend, 2 frontend), 2 untracked files.

### 2. Staging
The old skill doesn't guide staging decisions. Likely approach:
```bash
git add backend/app/models/scope_node.py backend/app/api/routers/scope.py frontend/src/features/scope/ScopeTree.tsx frontend/src/features/scope/useScopeTree.ts docs/notes.md
```
Bundles everything into one commit, including `backend/sedXYZ123` if not careful.

### 3. Pre-commit Checks
None.

### 4. Commit Message
```
add ordered children endpoint and frontend integration
```
No scope, no type prefix. Descriptive but doesn't follow conventional commits.

### 5. Git Commands
```bash
git add backend/app/models/scope_node.py backend/app/api/routers/scope.py frontend/src/features/scope/ScopeTree.tsx frontend/src/features/scope/useScopeTree.ts docs/notes.md
git commit -m "add ordered children endpoint and frontend integration"
```

### 6. Output
Just the commit result.

### Issues
- Bundles backend and frontend into one commit (CLAUDE.md says prefer separate)
- Doesn't clean up `backend/sedXYZ123` temp file
- No conventional commit format
- No pre-commit checks
- No Co-Authored-By
- Stages `docs/notes.md` without asking
