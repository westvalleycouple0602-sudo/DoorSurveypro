# GitHub and Replit workflow

GitHub is the shared source of truth for this private repository. Replit is the
working editor and preview environment. Saving or an Agent checkpoint is not
proof that a Git commit was pushed to GitHub; publishing is a separate action.

## Branches

| Branch | Purpose | How changes arrive |
| --- | --- | --- |
| `develop` | Working integration branch, including the existing app and build/UI repairs | Reviewed task pull requests |
| `feat/<task>`, `fix/<task>`, `chore/<task>`, `docs/<task>`, `test/<task>`, `refactor/<task>` | One small task from the current `develop` | Replit or local commits pushed to the same task branch |
| `main` | Release destination | Reviewed `develop` → `main` promotion after checks and release validation |
| `foundation/existing-app`, `fix/portable-build-field-ui` | Preserved import and repair references | Leave intact during the handoff |

As of setup on 2026-10-18, `main` does not yet contain the application. The
complete working source is `develop`, seeded from repair commit
`c8cfbdcd4752fe9b1a2bd43e83173af63ebf8185`. Main promotion stays draft while
existing verification failures are repaired. Do not import `main` into a new
Replit workspace expecting the app yet.

## Connect the existing Replit workspace once

Use the existing DoorSurveyPro app in the westvalleycouple0602 account. Verify
the Git pane connects to `westvalleycouple0602-sudo/DoorSurveypro` and that the
repository remains private. GitHub connector access in ChatGPT does not prove
that the workspace's Git credentials can push. If authentication or workflow
permission fails, reconnect source control using Replit's supported GitHub flow.
Never put a personal token in a remote URL, source file, or chat.

Before changing branches, preserve uncommitted work and compare it with
`develop`. Do not overwrite Replit-only changes. If the workspace still uses the
original oversized-catalog history, preserve that original and its full backups;
use a fresh clone of this repository and select `develop`, then carry over only
reviewed source differences on a new task branch. Do not copy the original
`.git`, merge unrelated histories, push the oversized PDF, or force-push.
Retain the original app until the clean workspace and its external connections
are verified. Source transfer does not migrate the database or uploaded media.

Use Node 22.15 or newer within Node 22, matching CI (`.nvmrc` selects 22). Restore
the existing lockfile with `npm ci --no-audit --no-fund`, then run
`node scripts/verify/installed-tools.mjs`. No database migration is part of setup.

## Daily work

1. Start with saved, committed work. Run `npm run work:start -- fix/short-name`
   (use `feat/short-name` for a feature). It fetches GitHub and creates a local
   task branch from the newest `develop`.
2. Make one coherent change. Run the relevant checks; inspect the changed files
   and commit only the intended source changes using Replit's Git pane.
3. Run `npm run work:push`. It pushes the current task branch to the same name
   on GitHub and sets its upstream. It never commits files for you.
4. Open a pull request with **base `develop`**, initially draft if work remains.
   Later pushes update that same PR. Open the PR early: task branch pushes alone
   do not run CI until there is a PR to `develop` or `main`.
5. Review the diff and checks, then merge the task PR into `develop`. Prefer a
   squash merge for a completed task. Start the next task from current `develop`.

The helpers refuse dirty worktrees, unexpected remotes, unfinished merges,
detached commits, pushes to shared branches, unrelated histories, and pushes
missing newer integration/task commits. They do not force-push, install hooks,
alter global Git configuration, or publish. Ordinary Git/Replit controls remain
available, so these helpers are safeguards rather than enforced branch protection.

If `develop` advanced, commit your work, merge `origin/develop` into your task,
resolve conflicts, rerun relevant checks, and push. If the same remote task branch
advanced, fetch and merge that branch first. Never resolve a rejection by forcing
your local copy over somebody else's commits. Assign a distinct task branch to
each person or agent and avoid concurrent edits in one shared Replit workspace.

## Checks and release

CI runs on pushes to `develop`/`main`, PRs into either branch, and manual dispatch.
This avoids duplicate push and PR runs for every task edit. New commits cancel
superseded runs for the same branch or PR. The four existing gates remain intact:

- Safe unit and contract tests
- Full application type check
- Production build
- Runtime dependency audit

The repaired source passed production build in run `39163894594`. It still has
345 TypeScript errors, 36 failing assertions, and 3 high dependency findings as
recorded in `docs/REPAIR-2026-10-18.md`. Do not hide failures, skip gates, or treat
the integration branch as production-ready. During baseline repair, any reviewed
integration of a targeted fix must describe which failures it addresses and which
remain; this is not a release waiver.

After the checks pass and isolated application validation is complete, review
the `develop` → `main` PR and use a **merge commit** to retain shared ancestry.
Bring that merge back into `develop` before the next task. Publish only a verified
`main` commit from a clean, synced Replit workspace, as a separate owner-requested
action. Merely pushing a branch or merging a PR does not publish this workflow.

## Branch protection status

GitHub returned HTTP 403 for repository rulesets on 2026-10-18: the private
repository's current plan requires GitHub Pro for this feature. No server-side
branch protection was enabled. Keep the repository private; do not change
visibility to obtain rulesets. If the owner later enables an eligible plan,
configure rules on `main` and `develop`: require PRs, block force pushes and
deletions, require resolved conversations, and require all four checks above.
Require an independent approval when a second reviewer is available; do not
create a solo-owner self-approval deadlock. Existing failures must be repaired
before enabling mandatory green checks on `develop`; `main` must not be released
while they remain. Until then, reviewers must apply these gates manually.

## References

- [Replit Git pane](https://docs.replit.com/features/workspace-tools/git-interface)
- [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Engineering verification](ENGINEERING_FOUNDATION.md)
- [Import and preservation requirements](../.agents/memory/collaboration-backup.md)
