# DoorSurvey Pro

Commercial door, frame, and hardware surveying and estimation.

## Working source

**[Open develop — the complete application](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/tree/develop).**

The default `main` branch is the release destination. During the initial repair
and import, the complete source is on `develop`; downloading `main` does not
yet download the app.

| Branch | Use |
| --- | --- |
| `develop` | Shared application source and current repairs |
| `feat/<task>`, `fix/<task>` and other task branches | Replit/local work, reviewed through PRs into `develop` |
| `main` | Reviewed release promotion after verification passes |
| `foundation/existing-app`, `fix/portable-build-field-ui` | Preserved import and repair references |

## Fast Replit workflow

1. Connect the existing Replit app to this private GitHub repository and preserve
   any Replit-only changes before switching to the clean source history.
2. Start a task from current `develop` with `npm run work:start -- fix/short-name`.
3. Edit, check, review the changed files, and commit in Replit.
4. Run `npm run work:push`, then open/update its pull request into `develop`.
5. Review and merge the task; publish only a verified release as a separate step.

Use Node 22.15+ within Node 22 and restore the lockfile with `npm ci`.
The helpers are available in the application source on `develop`.
See the [full workflow and first-time handoff](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/blob/develop/docs/GIT_WORKFLOW.md).

## Verification status

The repaired application passed its production build. Existing type errors,
test failures, and high dependency findings still prevent release certification.
See [recorded repair results](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/blob/develop/docs/REPAIR-2026-10-18.md).

CI keeps the full type check, safe unit tests, production build, and runtime
dependency audit visible. GitHub's current plan does not support enforced
branch rules for this private repository; review gates are applied manually.
No merge or push in this workflow automatically publishes Replit.

## Application guidance

- [Contributor instructions](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/blob/develop/AGENTS.md)
- [Architecture and current integration behavior](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/blob/develop/docs/architecture-overview.md)
- [Engineering checks and isolated test setup](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/blob/develop/docs/ENGINEERING_FOUNDATION.md)
- [Project roadmap](https://github.com/westvalleycouple0602-sudo/DoorSurveypro/blob/develop/docs/PROJECT_ROADMAP.md)

Preserve the existing app, original history/catalog backups, tenant data, local
account IDs, and service configuration. A source transfer does not move the live
database or uploaded files. Schema migrations and authenticated tests require
their own reviewed environment; they are not part of branch setup.

