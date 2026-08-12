# Leadership Action Hub — Update (redeploy)

## What changed

1. **All staff can send tasks and requests to any staff member or group**
2. **Family tab stays private** — Craig & Laura only
3. **Closed items hide from live lists** by default  
   - Use the **Closed** filter to see completed work  
   - **Open** / **All open** / **Overdue** never show closed items

## Redeploy on Vercel (after updating GitHub)

1. Upload the new files from `leadership-action-hub-vercel.zip` (replace existing files on GitHub), **or** push the updated project
2. Confirm these files are present under `leadership-action-hub/scripts/`:
   - `install-page.html` (required — previous deploy needed this)
3. Vercel → **Deployments** → **⋯** → **Redeploy** (disable build cache if offered)
4. Confirm **Environment Variables** still set:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` = `https://leadership-action-hub.vercel.app`
5. When status is **Ready**, open the hub and hard-refresh (Ctrl/Cmd+Shift+R)

## Hub link

https://leadership-action-hub.vercel.app

## Quick staff message (copy/paste)

---

Hi team,

The Leadership Action Hub has been updated:

**Hub:** https://leadership-action-hub.vercel.app

**What's new**
- You can send **tasks** and **requests** to **any team member** (or a group)
- When you mark something **complete**, it leaves the live lists
- To see finished work, use the **Closed** filter
- **My to do · Work** stays private to you

Sign in with your work email. First visit: set a password (8+ characters).

Questions → Craig or Laura

Thanks,  
Craig

---
