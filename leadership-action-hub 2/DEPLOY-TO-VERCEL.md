# Deploy Leadership Action Hub to Vercel

## What you need

1. A free [Vercel](https://vercel.com) account  
2. A free [Neon](https://neon.tech) Postgres database (required for shared multi-user data)  
3. This project folder (or the zip: `leadership-action-hub-vercel.zip`)

---

## Step 1 — Create the database (Neon)

1. Go to https://console.neon.tech and sign up / log in  
2. **Create a project** (any name, e.g. `leadership-hub`)  
3. Open **Connection details** and copy the connection string  
   - Looks like: `postgresql://user:password@ep-….aws.neon.tech/neondb?sslmode=require`  
4. Keep this as `DATABASE_URL`

---

## Step 2 — Put the code on GitHub (recommended)

1. Create a new empty GitHub repository  
2. Upload / push this project (do **not** upload `node_modules`)  
3. Or unzip `leadership-action-hub-vercel.zip` and push that folder  

```bash
# From the project folder
git init
git add .
git commit -m "Leadership Action Hub"
# create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Import into Vercel

1. Go to https://vercel.com/new  
2. **Import** your GitHub repository  
3. Framework: leave default (Vite / Nitro will build via `npm run build`)  
4. **Do not deploy yet** — add environment variables first (Step 4)  
   - Or deploy once, then add env vars and **Redeploy**

### Build settings (usually auto)

| Setting | Value |
|---------|--------|
| Install | `npm install` |
| Build | `npm run build` |
| Output | handled by Nitro Vercel preset |

---

## Step 4 — Environment variables (Vercel)

In Vercel → Project → **Settings → Environment Variables**, add for **Production** (and Preview if you want):

| Name | Value | Notes |
|------|--------|--------|
| `DATABASE_URL` | Neon connection string | Required for shared team data |
| `BETTER_AUTH_SECRET` | Long random string (32+ chars) | e.g. generate with a password manager |
| `BETTER_AUTH_URL` | Your live site URL | e.g. `https://your-project.vercel.app` |

After the first deploy, if Vercel gave you a URL like `https://leadership-hub-xxx.vercel.app`, set `BETTER_AUTH_URL` to that exact URL (no trailing slash), then **Redeploy**.

Optional later:
- Custom domain in Vercel → Domains  
- Update `BETTER_AUTH_URL` to the custom domain and redeploy  

---

## Step 5 — Deploy

1. Click **Deploy** (or Redeploy after env vars)  
2. Wait for the build to finish green  
3. Open the production URL  

---

## Step 6 — First login checks

1. Open the live URL  
2. Sign in as CEO: `craig@helpingheroes.com.au`  
   - Set a password on first visit (or use the password you already use in preview)  
3. Open **Staff profiles** and confirm the team list  
4. Create a test task  
5. Sign out and sign back in  

Put the live URL into the staff onboarding email as **[HUB LINK]**.

---

## Staff login emails (current)

| Name | Email |
|------|--------|
| Craig Rivett | craig@helpingheroes.com.au |
| Laura Rivett | laura@helpingheroes.com.au |
| Akal Dalby | akal@helpingheroes.com.au |
| Elise Gurney | elise@communityassist.com.au |
| Evi Ackland | evi@communityassist.com.au |
| Jessica Goodsell | jessica@helpingheroes.com.au |
| Paige Banning | paige@crconsulting.net.au |

Staff: first visit = choose password (8+ characters).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Open Vercel build logs; ensure `npm run build` works |
| Blank page / buttons dead | Confirm deploy finished; hard-refresh; check browser console |
| Login fails after domain change | Update `BETTER_AUTH_URL` to the new domain and redeploy |
| Data disappears / empty hub | `DATABASE_URL` missing — add Neon URL and redeploy |
| “Email not on staff list” | Craig/Laura add the work email under Staff profiles |

---

## Optional: deploy with Vercel CLI

```bash
npm install -g vercel
cd leadership-action-hub   # this project folder
npm install
vercel login
vercel                 # preview
vercel --prod          # production
```

Set the same environment variables in the Vercel dashboard.

---

## Security notes

- Never commit real `DATABASE_URL` or `BETTER_AUTH_SECRET` into Git  
- Use Vercel Environment Variables only  
- `.env` files are for local use and are gitignored  
