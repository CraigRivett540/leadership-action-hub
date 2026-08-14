# Redeploy — Dr. Phil / Latest news removed

## What changed
- Removed the Dr. Phil × David Grusch podcast
- Removed Latest news from the home/sign-in page
- Removed the Latest news tab and Overview news block

If you uploaded an earlier zip, also **delete these two files on GitHub** if they are still there:
- `src/lib/news.ts`
- `src/components/app/latest-news.tsx`

## Redeploy
1. Download `leadership-action-hub-vercel.zip` and unzip
2. GitHub → inner `leadership-action-hub` folder
3. **Add file → Upload files** → replace all
4. Delete `src/lib/news.ts` and `src/components/app/latest-news.tsx` if they remain
5. Commit
6. Wait for Vercel **Ready**
7. Hard refresh https://leadership-action-hub.vercel.app
  (Ctrl+Shift+R / Cmd+Shift+R)
