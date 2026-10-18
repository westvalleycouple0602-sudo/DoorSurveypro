
# 🚪 Door & Frame Survey Application  
[![CI](https://github.com/<yourname>/door-survey-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/<yourname>/door-survey-pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Replit Deploy](https://img.shields.io/badge/Deploy%20on-Replit-667881?logo=replit)](https://replit.com/@<yourname>/door-survey-pro)
[![Made with Flask](https://img.shields.io/badge/Made%20with-Flask-000?logo=flask)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow.svg?logo=python)](https://www.python.org/)

> **Cross-platform LiDAR/AR application** for automated **door, frame, and hardware surveying** with  
> DXF export, quality metrics, and integrated bug reporting (Slack + SendGrid).

---

### 🏷️ Repository Metadata
- **Topics:** `flask`, `lidar`, `arcore`, `arkit`, `door-survey`, `dxflib`, `trimesh`, `open3d`, `sendgrid`, `slack-webhook`, `access-control`, `hardware-automation`
- **Primary Language:** Python (Flask + HTML/JS frontend)
- **Deployment Options:** Replit (1-click), Docker, local Python 3.11+

---

### 🧭 Quick Links
- [📘 Documentation](./README.md)
- [💻 Replit Deployment Guide](./README-Replit.md)
- [🐞 Bug Reporting UI](./public/bug.html)
- [📊 Dashboard](./public/dashboard.html)
- [🧰 Admin Bug Panel](./public/bugs.html)



# Door & Frame Survey Application (LiDAR + AR)

A cross-platform web app built for **door, frame, and hardware surveying** — with integrated **LiDAR/AR scanning**, automated DXF export, and bug reporting dashboard.

## 🚀 Features

### Survey & Measurement
- iPhone LiDAR / Android ARCore support
- Automated DXF export of openings
- Door, frame, and hardware metadata tagging

### Reporting & Quality Control
- Error analysis (σ width, plumb, parallelism)
- DXF download, vendor doc previews, and progress logs
- Integrated bug reporting form with:
  - Screenshot upload
  - Auto-attached scan logs
  - Slack and SendGrid email notifications

### Admin Dashboard
- Manage scans and bug reports
- Update bug statuses, assignee, and notes
- Color-coded quality metrics and DXF links

## 🧩 Tech Stack
- **Backend:** Flask (Python)
- **Frontend:** HTML + JS + Tailwind
- **3D Processing:** NumPy, Trimesh, Open3D (optional)
- **Notifications:** Slack Webhook / SendGrid Email

## ⚙️ Deployment on Replit
1. Upload this repo to Replit.
2. Press **Run** — defaults to lean requirements.
3. Optional: use `requirements-full.txt` for Open3D features.

### Environment Variables (Secrets)
| Variable | Description |
|-----------|--------------|
| `BUG_WEBHOOK_URL` / `SLACK_BUG_WEBHOOK` | Slack notification endpoint |
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `BUG_EMAIL_TO` | Comma-separated recipient emails |
| `BUG_EMAIL_FROM` | Optional sender email |
| `REQ_FILE` | (optional) `requirements-full.txt` for Open3D |

## 🧠 Development
```bash
pip install -r requirements.txt
python app.py
```
Open `http://localhost:5000` or Replit's Webview.

### File structure
```
app.py
public/              # Frontend HTML/JS
storage/             # Artifacts & logs
.github/workflows/   # CI/CD pipelines
```

## 🧪 GitHub Actions CI

Includes automated Python lint/test pipeline for PRs.

## 🪶 License
MIT — free to use and adapt.
