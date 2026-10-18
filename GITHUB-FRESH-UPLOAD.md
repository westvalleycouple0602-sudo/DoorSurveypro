# Fresh GitHub upload — no old commits

This repository intentionally has ONE initial commit on the branch
`github-upload-clean`. It contains the current committed source and reference
files except the oversized original catalog PDF.

The original app, original PDF and full-history backups are preserved separately.
This copy does NOT import their old Git history. Stripe remains in the source.

## Use this specific new copy

1. Extract `DoorSurvey-Fresh-GitHub-Upload.zip` into a NEW location on your computer,
   outside every existing repository. Do not merge it into the previous copy.
2. In GitHub Desktop choose File > Add Local Repository. Select the extracted
   `DoorSurvey-Fresh-GitHub-Upload` folder itself, not its parent.
3. Confirm Current Branch says `github-upload-clean`.
4. Confirm History contains ONE commit: `Fresh GitHub upload without legacy history`.
5. Click Publish branch (or Push origin if already published). The remote is the
   existing private DoorSurveypro repository. Do not upload the ZIP through the
   GitHub website, and do not copy backup ZIPs into this repository.
6. Once uploaded, import that repository into the shared Replit workspace,
   selecting `github-upload-clean` if another branch is the default.

Every file in this commit is below GitHub's ordinary 100 MB per-file limit.
Deleting a large file in a new commit cannot fix a different repository's old
history; that is why this copy starts with a new, distinct branch and one commit.

Live databases, external Object Storage, environment secrets, deployments and
Agent chat/canvas are not included. Reconnect services in the shared workspace.
Keep the original app and all full-history backups until the new app works.
