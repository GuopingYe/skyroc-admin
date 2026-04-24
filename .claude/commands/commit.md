---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(git stash:*), Bash(npx tsc:*), Bash(npx eslint:*), Bash(cd frontend && npx eslint:*), Bash(cd backend && python*), Bash(pnpm eslint:*), Bash(pnpm tsc:*), Bash(ruff check:*), Bash(ruff:*), Bash(cd d:/github/clinical-mdr/frontend*), Bash(cd d:/github/clinical-mdr/backend*)
description: Create a git commit with conventional commits, monorepo awareness, and pre-commit checks. Use this whenever the user asks to commit, save, or checkpoint changes — even if they just say "commit" or "check this in".
argument-hint: "[target] — backend | frontend | staged | <glob> | <natural language>"
---

# Commit Workflow

**Input**: $ARGUMENTS

---

## Phase 1 — GATHER CONTEXT

Run these in parallel:

- `git status --short`
- `git diff HEAD` (staged + unstaged changes)
- `git log --oneline -10` (recent style reference)
- `git branch --show-current`

If working tree is clean (no modified, no untracked), stop: "Nothing to commit."

Before moving on, clean up temp files that shouldn't be committed:
```bash
find . -maxdepth 3 -name "*.tmp" -o -name "sed*" 2>/dev/null | head -20
```
If found, delete them and mention it.

---

## Phase 2 — DETERMINE SCOPE & STAGING

This is a monorepo with `backend/` and `frontend/` directories. Analyze what changed.

### Interpret $ARGUMENTS for staging

| Input | Action |
|---|---|
| *(empty)* | Stage all modified/tracked changes. Do NOT `git add -A` — avoid pulling in unrelated untracked files. Use `git add -u` for tracked changes, then review if untracked files are relevant. |
| `backend` | Stage only `backend/` changes: `git add backend/` |
| `frontend` | Stage only `frontend/` changes: `git add frontend/` |
| `staged` | Use whatever is already staged — no `git add` |
| `*.py` / glob | `git add '<glob>'` |
| Natural language ("the auth changes") | Cross-reference `git status` + `git diff` to find matching files. Show the user which files matched and why. |
| Specific filenames | `git add <files>` |

### Monorepo split detection

If both `backend/` and `frontend/` have meaningful changes (not just one-line config tweaks), and the user did NOT specify a target:
- **Suggest splitting into two commits** — one for backend, one for frontend.
- Show what would go in each: "Backend: 3 files changed (api router, model, migration). Frontend: 2 files changed (component, hook)."
- Ask the user: "Both sides have changes. Commit separately (recommended) or bundle into one?"

If the user says "bundle" or the changes are trivially coupled (e.g., a type rename that touches both), commit together with no scope.

### Safety checks

Before staging, scan the diff for:
- **Secrets**: `.env` files, `SECRET_KEY`, `password`, `token`, `API_KEY`, `credentials`. If found, **STOP** and warn the user. Do not commit these.
- **Large files**: Files over 500KB. If found, warn and ask before staging.
- **Generated files**: `node_modules/`, `__pycache__/`, `.pyc`, `dist/`, `build/`. Skip these.

---

## Phase 3 — PRE-COMMIT CHECKS

Run linting and type-checking for the directories being committed. These catch issues that pre-commit hooks would also flag — better to catch them now than have the commit fail.

**If committing backend changes:**
```bash
cd d:/github/clinical-mdr/backend && ruff check app/ --quiet 2>&1 | head -30
```

**If committing frontend changes:**
```bash
cd d:/github/clinical-mdr/frontend && npx tsc --noEmit 2>&1 | tail -20
```

If errors are found:
- Fix them immediately if simple (unused imports, missing types)
- If complex, warn the user and ask whether to proceed anyway
- Re-run the check after fixing to confirm

---

## Phase 4 — CRAFT COMMIT MESSAGE

### Format

```
type(scope): imperative description
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix or correction |
| `refactor` | Code restructuring, no behavior change |
| `docs` | Documentation, comments, specs |
| `test` | Adding or updating tests |
| `chore` | Build, config, dependencies, tooling |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace, no logic change |
| `ci` | CI/CD pipeline changes |

### Scopes

Match the project's monorepo structure:
- `backend` — for changes in `backend/`
- `frontend` — for changes in `frontend/`
- Omit scope if changes span both or are project-level (root config, docs)

### Rules

- **Imperative mood**: "add feature" not "added feature" or "adds feature"
- **Lowercase** after the type prefix
- **No period** at the end
- **Under 72 characters** for the subject line
- Focus on **why**, not just what — if the change fixes a specific issue or enables a capability, say so
- Look at recent commit history (`git log --oneline -10`) and match the existing style

### Examples from this repo

```
feat(backend): add GET /admin/sync/cdisc/versions endpoint
fix(frontend): disable Sync Now when version select is loading or errored
refactor: extract CT_PACKAGE_TYPE_NAMES as single source of truth
docs: add implementation plan for CDISC sync UX improvements
fix(backend): fix CDASHIG/SENDIG NameError and duplicate CT node cleanup
```

---

## Phase 5 — COMMIT

Stage the determined files, then commit with the crafted message.

```bash
git add <files>
```

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

[Optional body if changes are complex — explain the WHY in 1-3 lines]

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Include a body paragraph only when:
- The change is non-trivial and the subject alone doesn't convey intent
- Multiple logical changes are bundled (explain each)
- There's context a future reader would need (e.g., "resolves #123" or "required for the new sync flow")

After committing, verify:
```bash
git status --short
```

---

## Phase 6 — OUTPUT

Report to the user:

```
Committed: <short-hash>
Message:   type(scope): description
Files:     <N> file(s) changed

Next steps:
  - git push                    → push to remote
  - /commit-push-pr             → push and create a PR
```

If you split into multiple commits, show each one.

---

## Error Recovery

**Pre-commit hook fails**: The commit did NOT happen. Fix the issue (don't use `--no-verify`), re-stage if needed, and create a NEW commit. Do not `--amend` — that would modify the previous commit.

**Nothing staged after filtering**: "No files matched your description. Here's what's available:" — show `git status` output.

**Merge conflict markers in diff**: Stop and warn the user. Resolve conflicts before committing.
