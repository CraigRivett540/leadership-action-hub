# Redeploy — live refresh, edit/delete, closed tab, leadership privacy

## What changed

- **Live refresh** every 8 seconds (and when you return to the tab). New items appear without a manual refresh. A toast appears when new work arrives.
- **Edit** and **Delete** on items you posted (publisher only).
- **Craig and Laura** cannot see each other’s requested / assigned work (unless it is assigned directly to them).
- **Volume boxes** on every tab (open / overdue / tasks / requests).
- **Completed items** leave all live tabs and sit only in **Closed actions**. Either person involved can **Re-open**.

## Redeploy

1. Download `leadership-action-hub-vercel.zip` and unzip
2. GitHub → `CraigRivett540/leadership-action-hub` → inner `leadership-action-hub` folder
3. **Add file → Upload files** → drag everything from the unzipped folder (replace)
4. Commit
5. Vercel auto-deploys, or **Deployments → ⋯ → Redeploy** (no build cache)
6. Confirm env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` = `https://leadership-action-hub.vercel.app`
7. Open the hub and hard-refresh (Ctrl+Shift+R / Cmd+Shift+R)

Hub: https://leadership-action-hub.vercel.app
