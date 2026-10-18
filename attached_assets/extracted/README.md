

---

## UI Enhancements
- Dashboard: buttons for full processing, anchors, and ROIs.
- Process page: inline Anchors form.
- Viewer: overlays computed opening rectangle and shows quality flags.


---

## New UI features
- **Scanner page**: LiDAR file upload, one-click **Process Full**, link to **Progress Page**, and automatic **DXF download** link when available.
- **Dashboard**: right-side **Vendor Docs** pane (fetches `/scrapeCatalog` & `/catalogLookup`), with inline preview (note: some sites block iframes).


---

## Bug Reporting
- **UI page:** `/public/bug.html` (also linked from Dashboard / Process / Viewer / Scanner)
- **Upload screenshot:** `/uploadBugFile` (multipart/form-data with `file`)
- **Submit bug:** `POST /reportBug` with JSON
- **List bugs:** `GET /bugs` and `GET /bugs/<id>`
- **Webhook:** set env var `BUG_WEBHOOK_URL` (or `SLACK_BUG_WEBHOOK`) for Slack notifications.


---

## Bug Admin & Notifications
- **Admin UI:** `/public/bugs.html` to review, filter, and update bug status/assignee/notes.
- **Logs Auto-Attach:** When `scan_id` is included in `/reportBug`, the server attaches a **tail of the current progress log** and links `/progress/<scan_id>`.
- **Email Notifications (optional via SendGrid):**
  - Set env vars in Replit:
    - `SENDGRID_API_KEY` – your API key
    - `BUG_EMAIL_TO` – recipient(s), comma-separated
    - `BUG_EMAIL_FROM` – sender (optional; defaults to noreply@example.com)
- **Slack/Webhook (optional):** `BUG_WEBHOOK_URL` or `SLACK_BUG_WEBHOOK`.
