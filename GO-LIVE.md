# JMS Go Live (GitHub Pages)

## 1) Put project in a GitHub repo

If this folder is not already your target repo root, create a new repo and push this folder content.

## 2) Configure GitHub Pages

In GitHub repository settings:

- **Settings -> Pages**
- Source: **GitHub Actions**

## 3) Add backend URL secret

In GitHub repository:

- **Settings -> Secrets and variables -> Actions**
- Add secret:
  - `VITE_API_BASE_URL` = your Apps Script web app URL  
    Example: `https://script.google.com/macros/s/AKfy.../exec`

## 4) Push to `main`

On push, workflow `.github/workflows/deploy-web.yml` builds and deploys `web/dist`.

## 5) Share URLs

Your public site URL format:

- `https://<github-username>.github.io/<repo-name>/`

User registration page:

- `https://<github-username>.github.io/<repo-name>/#/register`

Admin dashboard page:

- `https://<github-username>.github.io/<repo-name>/#/admin`

## Notes

- Admin PIN: `1314`
- After backend code changes, redeploy Apps Script web app.

