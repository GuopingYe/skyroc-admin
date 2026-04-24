# Eval 1: Backend Fix — NEW Skill Simulation

## Skill Used
New commit command at `.claude/commands/commit.md` with 6 phases: Gather Context, Scope & Staging, Pre-commit Checks, Craft Message, Commit, Output.

## Simulated Workflow

### Phase 1 — Gather Context
Runs in parallel:
- `git status --short` → sees `M backend/...sync.py`, `M backend/...admin.py`, `?? backend/.tmp_sync_test.py`
- `git diff HEAD` → sees the version handling fix
- `git log --oneline -10` → sees conventional commit history
- `git branch --show-current` → `feature/cdisc-sync-fix`

**Cleanup**: Finds `backend/.tmp_sync_test.py` (untracked .tmp file). Deletes it. Mentions: "Cleaned up temp file: backend/.tmp_sync_test.py"

### Phase 2 — Determine Scope & Staging
User said "backend" → stage only backend changes.

**Safety scan**: No secrets, no large files. The `.tmp` file was already cleaned up.

Staging:
```bash
git add backend/app/services/cdisc_sync.py backend/app/api/routers/admin.py
```

Only the two files the user specified. The untracked `.tmp` file was already removed, so won't be staged.

### Phase 3 — Pre-commit Checks
Committing backend changes, so:
```bash
cd d:/github/clinical-mdr/backend && ruff check app/ --quiet 2>&1 | head -30
```
Assuming ruff passes (clean output).

### Phase 4 — Craft Commit Message
Looking at git history, the pattern is `fix(backend): imperative description`.

Changes: Fix crash when external API returns unexpected version format. Two files: service gets defensive `.get()`, router adds normalize_version helper.

```
fix(backend): handle unexpected version format in CDISC sync
```

- Type: `fix` (bug fix)
- Scope: `backend` (both files in backend/)
- Imperative mood: "handle" not "handles" or "handled"
- Under 72 chars: 54 chars
- No period

### Phase 5 — Commit
```bash
git add backend/app/services/cdisc_sync.py backend/app/api/routers/admin.py
git commit -m "$(cat <<'EOF'
fix(backend): handle unexpected version format in CDISC sync

Use defensive .get() for version field and add normalize_version
helper to prevent crashes when CDISC API returns unexpected formats.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Verification: `git status --short` → clean (both files committed, .tmp was deleted)

### Phase 6 — Output
```
Committed: abc1234
Message:   fix(backend): handle unexpected version format in CDISC sync
Files:     2 file(s) changed

Next steps:
  - git push                    → push to remote
  - /commit-push-pr             → push and create a PR
```

### Strengths over old skill
- Conventional commit with scope: `fix(backend):`
- Pre-commit ruff check
- Temp file cleanup
- Body paragraph explaining the "why"
- Co-Authored-By trailer
- Structured output with next steps
