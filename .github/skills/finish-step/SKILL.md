---
name: finish-step
description: Finish a completed lesson by pushing committed work, merging it into main, deleting the remote feature branch, and leaving the workspace clean. Use when the user invokes /finish-step or asks to finish and clean up a lesson.
allowed-tools:
  - shell
---

# Finish Step

Use this skill only when the user explicitly asks to finish the current lesson or invokes `/finish-step`. It assumes the lesson work has already been committed on the current feature branch.

## Goal

Push the current committed branch, merge it into `main`, delete the remote feature branch, prune stale refs, and report any remaining local cleanup that cannot be done because the current session is using the branch.

## Preconditions

1. Follow the repository contribution guidance before creating or merging a pull request.
2. Confirm the working tree is clean with `git status --short --branch`.
3. Confirm the current branch is not `main` and has committed work that is not already merged.
4. If there are uncommitted changes, stop and ask the user whether to commit, discard, or leave them.
5. Run the appropriate checks through the `quality-checks` skill before merging unless the user explicitly states checks already passed for the exact commit being merged.

## Procedure

1. Fetch the latest default branch:

   ```bash
   git fetch origin main --quiet
   ```

2. Push the current branch and set upstream:

   ```bash
   git push -u origin HEAD
   ```

3. Create a pull request to `main` using the repository pull request template. If a PR already exists for the branch, reuse it.
4. Merge the pull request into `main` with remote branch deletion enabled:

   ```bash
   gh pr merge <number> --repo jernejk/tailspin-toys --merge --delete-branch
   ```

5. Verify the pull request is merged and the remote branch is gone:

   ```bash
   gh pr view <number> --repo jernejk/tailspin-toys --json state,mergedAt
   git ls-remote --heads origin <branch-name>
   ```

6. Prune stale remote refs and check the workspace:

   ```bash
   git fetch --prune --quiet
   git status --short --branch
   ```

## Reporting

Report the outcome briefly:

- PR merged into `main`
- Remote branch deleted
- Current local branch status

If the local branch cannot be deleted because the active session is checked out on it, say so plainly and do not force-delete it.
