# Eval 1: Backend Fix — OLD Skill Simulation

## Skill Used
The old skill (`commit-commands:commit`) only says:
> Based on the above changes, create a single git commit.

It provides `git status`, `git diff HEAD`, `git branch --show-current`, and `git log --oneline -10` as context via `!` backtick commands.

## Simulated Workflow

### 1. Context Gathered
The `!` commands auto-populate git status, diff, branch, and recent commits.

### 2. Staging
```bash
git add backend/app/services/cdisc_sync.py backend/app/api/routers/admin.py
```
(Only stage the files the user mentioned, but no explicit reasoning about the .tmp file)

### 3. Pre-commit Checks
None — the old skill doesn't mention linting or type-checking.

### 4. Commit Message
```
fix crash in CDISC sync when API returns unexpected version format
```
No conventional commit format. No scope. The message is reasonable but doesn't follow `type(scope):` pattern.

### 5. Git Commands
```bash
git add backend/app/services/cdisc_sync.py backend/app/api/routers/admin.py
git commit -m "fix crash in CDISC sync when API returns unexpected version format"
```

### 6. Output
Just the commit result — no structured output format, no next steps.

### Issues
- No conventional commit format (`fix(backend):`)
- No pre-commit lint check (ruff)
- Didn't address the `.tmp` temp file
- No Co-Authored-By trailer
- No structured output with next steps
