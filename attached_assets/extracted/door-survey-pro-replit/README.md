# Door Survey Pro – Project Management (Replit package)

Python (FastAPI) backend + React/Tailwind frontend, integrated with Jira/Confluence, Google Calendar, and Outlook (Microsoft Graph).

## Quick start (Replit)

1. **Add Secrets** (from `backend/.env.example`): `BASE_URL`, Atlassian, Google, Microsoft client IDs/secrets, and callback URLs.
2. **Install backend deps**:
   ```bash
   cd backend && pip install -r requirements.txt
   ```
3. **Build frontend**:
   ```bash
   cd ../frontend && npm i && npm run build
   ```
4. **Run app**:
   ```bash
   cd ../backend && uvicorn main:app --host 0.0.0.0 --port 8000
   ```
5. Open the web view. The FastAPI server will serve the built React app.

> During development you can run `npm run dev` in `/frontend` and point `VITE_API_BASE` to your FastAPI URL.

## Notes
- This scaffold includes token refresh utilities and webhook endpoints.
- Add DB migrations and proper auth for multi-user production.


## GitHub App setup (env secrets)
- `GITHUB_APP_ID` – numeric App ID
- `GITHUB_APP_PK_PEM` – paste full private key PEM
- `GITHUB_WEBHOOK_SECRET` – webhook secret from the App
(Optional) `GITHUB_DEFAULT_OWNER`, `GITHUB_DEFAULT_REPO`
Webhook URL: `https://<your-replit>/webhooks/github`
