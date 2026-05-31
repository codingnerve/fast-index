# Deploying IndexFast to Vercel (free, no payments)

This app now runs in **FREE_MODE by default**: every signed-up user can submit
unlimited URLs with no credits and no payment. The Razorpay code stays in the
repo but is never used (don't set the `RAZORPAY_*` env vars).

SQLite (the old local default) can't run on Vercel's serverless filesystem, so
production uses **MongoDB Atlas**. The schema is already set to `mongodb`.

---

## 1. Create a free MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas → sign up (free).
2. **Create a deployment** → choose **M0 (Free)** → pick a cloud/region → **Create**.
3. **Create a database user**: set a username + password (save them).
4. **Network Access** → Add IP Address → **Allow Access from Anywhere**
   (`0.0.0.0/0`) so Vercel's servers can connect.
5. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Add a database name** right before the `?` — use `indexfast`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/indexfast?retryWrites=true&w=majority
   ```
   Replace `USER`/`PASSWORD` with the user from step 3. This is your `DATABASE_URL`.

> Atlas M0 runs as a replica set, which Prisma needs for the transaction in
> the indexing code — so the free tier is enough.

## 2. Push the schema to that database

Run once from your machine, pointing at the prod URL (PowerShell):
```powershell
$env:DATABASE_URL="mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/indexfast?retryWrites=true&w=majority"
npx prisma db push
```
(bash: `DATABASE_URL="mongodb+srv://..." npx prisma db push`)

## 3. Push the code to GitHub

```bash
git init && git add -A && git commit -m "IndexFast — free mode"
gh repo create indexfast --private --source=. --push
```

## 4. Import into Vercel

- vercel.com → Add New → Project → import the repo.
- Framework preset: **Next.js** (auto-detected). Build command stays
  `npm run build` (it runs `prisma generate` first).

## 5. Set Environment Variables (Vercel → Settings → Environment Variables)

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | The MongoDB Atlas `mongodb+srv://...` string from step 1 |
| `AUTH_SECRET` | ✅ | Login/JWT secret. Generate: `openssl rand -hex 32` |
| `INDEXNOW_KEY` | for **real** indexing | 8–128 hex chars. Without it, IndexNow runs in *simulation mode* (no live submission) |
| `INDEXNOW_KEY_LOCATION` | with the key above | `https://YOURDOMAIN/api/indexnow-key` (the app serves this file automatically) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | optional | one-line service-account JSON, only for Google indexing |
| `FREE_MODE` | optional | Defaults to free. Set to `"false"` **only** if you ever want to re-enable paid credits |
| `RAZORPAY_*` | ❌ skip | Not needed in free mode |

## 6. Point your domain + go live

- Add your custom domain in Vercel → Settings → Domains.
- Set `INDEXNOW_KEY_LOCATION` to `https://yourdomain.com/api/indexnow-key`.
- Redeploy. Users can sign up and index for free.

---

## ⚠️ Important limitation on the free Vercel (Hobby) plan

`runIndexJob` submits every URL **synchronously inside the HTTP request**.
Vercel Hobby caps serverless functions at **~10 seconds**. Small batches are
fine; very large bulk submissions can time out before finishing. If you need
large bulk jobs on the free plan, the submission loop needs to move to a
background queue/cron — otherwise upgrade to Vercel Pro for longer limits.

## Common MongoDB Atlas gotchas

- **`prisma db push` hangs or "server selection timeout"** → you skipped
  Network Access. Atlas → Network Access → allow `0.0.0.0/0`.
- **"authentication failed"** → wrong DB user/password, or your password has
  special characters (`@ : / ? # &`). URL-encode them in the string (e.g.
  `@` → `%40`, `#` → `%23`).
- **Make sure the DB name is in the URL** (`.../indexfast?...`), otherwise data
  lands in the default `test` database.

## Re-enabling paid mode later

Everything is preserved. Set `FREE_MODE="false"`, configure the `RAZORPAY_*`
env vars, and the credit checks, pricing page, and top-up flow come back —
no code changes needed.
