---
name: Collaboration backup requirements
description: User requirements for preserving this app before moving to a shared workspace
---

The GitHub backup for this app's shared-workspace move must be private.

For the oversized catalog PDF, the user chose a separate downloadable backup rather than Git LFS. Omit that PDF only from the GitHub backup copy's history, not from the original project.

**Why:** The user chose a private repository. They said the app will be rebuilt and redesigned after moving for collaboration, but they do not want to lose the existing work.

**How to apply:** Preserve the existing code and history before the rebuild. The user said connections can be reconnected after moving and the database can be rebuilt if needed; that does not authorize deleting the original work.

The user also authorized a downloadable project ZIP and Git-history backup when GitHub authentication remained blocked.

**Why:** The user chose this alternative rather than waiting for the GitHub upload.

**How to apply:** Keep the original intact. Preserve large reference files as well as code and reachable local-branch history. Clearly distinguish prepared downloads from an actual completed workspace move or GitHub upload.

The fresh upload snapshot is an additional fallback; it does not replace the original branches or full-history backups. Use an explicitly selected GitHub-safe branch or repository when uploading.

**Why:** The user supplied a rejection naming the original oversized catalog in a push of the original branch, despite separate cleaned copies having been prepared. An unrelated fresh repository also conflicts with existing remote history.

**How to apply:** Preserve original history and backups, label the snapshot's missing history clearly, and check the actual branch being pushed. For a Desktop fallback, clone the existing remote into a new folder, overlay only clean source files without a copied `.git` directory, and commit on a new branch. Never merge the original oversized-file history into the upload snapshot just to address a generic push rejection.

## Authentication and large-file constraints

GitHub App connector access and workspace Git source-control authentication are separate. A successful private-repository API call, or a healthy OAuth status, does not prove Git can push.

**Why:** The app connector changed repository privacy successfully, while workspace Git received HTTP 401 and stalled during credential handling.

**How to apply:** Verify private Git access separately and use the source-control reconnection flow if it fails; do not fetch or expose raw tokens as a workaround.

A generic push rejection is not proof that the remote has additional commits.

**Why:** The user's UI suggested a remote-history conflict, but the GitHub API showed an empty repository and the explicit Git push failed authentication.

**How to apply:** Inspect remote branch references and explicit Git errors before pulling, merging, or force-pushing. Confirm the upload branch's destination without altering original or remote history.

GitHub App API access can upload a clean snapshot when Git source-control authentication is broken, but writing GitHub Actions files requires the actual token's `workflow` permission.

**Why:** Normal blob/tree writes succeeded, while a tree containing the existing CI workflow returned HTTP 404. The response's granted OAuth scopes omitted `workflow`, even though the reconnection metadata included it.

**How to apply:** Verify actual write access and scopes, not just repository `canPush` or healthy connection metadata. Reauthorize the GitHub App connection for missing workflow permission rather than repeating Git Provider setup. Do not silently omit CI files.

Library asset registration rejects files larger than 100 MiB, independently of GitHub's large-file restriction.

**Why:** Registering the original oversized catalog PDF failed at that delivery limit.

**How to apply:** Keep the original intact and provide large reference documents as bounded-size parts, checking page coverage and appearance rather than reducing image quality.
