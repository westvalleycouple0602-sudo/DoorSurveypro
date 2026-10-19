
# Replit Packaging Guide

This project is pre-configured for Replit.

## Files
- `.replit` — start command + env
- `replit.nix` — Python toolchain
- `start.sh` — installs deps and runs the server
- `requirements.txt` — **lean** deps (fast install)
- `requirements-full.txt` — optional heavy deps (Open3D, ezdxf)

## Running
1. Create a new Replit and upload the contents of this folder.
2. Press **Run** (or run `bash start.sh` in the shell).  
   - By default it installs **lean** requirements.
3. Open the webview; the app serves `/public/index.html` at `/`.

## Optional: enable full geometry pipeline
- In the Replit shell:  
  `export REQ_FILE=requirements-full.txt`  
  `bash start.sh`
- Or set the **Secrets** variable `REQ_FILE=requirements-full.txt` and press **Run**.

## Environment variables (optional)
- Slack / Webhook:  
  - `BUG_WEBHOOK_URL` or `SLACK_BUG_WEBHOOK`
- SendGrid email:
  - `SENDGRID_API_KEY`
  - `BUG_EMAIL_TO` (comma-separated)
  - `BUG_EMAIL_FROM` (optional)

## URLs & Pages
- `/` → `public/index.html` (Scanner)
- `/public/process.html` — live progress UI
- `/public/dashboard.html` — dashboard with actions & logs panel
- `/public/viewer.html` — viewer overlay
- `/public/bug.html` — bug report form
- `/public/bugs.html` — bug admin UI

## Notes
- If you need **Open3D**, use `requirements-full.txt`. It can take longer to build.
- App binds to `0.0.0.0` and uses Replit's `$PORT` automatically.
