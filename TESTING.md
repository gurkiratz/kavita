# Testing before you deploy

Nothing here touches the live collection unless a step says so explicitly.

Three things can be tested independently: the **admin Worker**, the **app in a browser**,
and the **production web build**. Test in that order — the Worker is where the destructive
code lives.

---

## 1. The admin Worker, against a fake local bucket

`wrangler dev` (without `--remote`) simulates R2 on disk under `worker/.wrangler/state`.
Writes, deletes, and image uploads all work, and none of them reach Cloudflare.

```bash
cd worker
npm run seed:local     # copy remote/poems.json into the simulated bucket, once
npm run dev            # http://localhost:8787
```

The password is whatever `worker/.dev.vars` sets as `ADMIN_TOKEN` — a different value from
production, which is the point.

To see exactly what the Worker wrote:

```bash
npm run dump:local
```

To start over, delete `worker/.wrangler/state` and re-seed.

**What to exercise, given what the Worker now does:**

- Save a new poem, then `npm run dump:local` and confirm the Gurmukhi landed as **Unicode**,
  not Akhar ASCII.
- Attach an image and save. The thumbnail must still render **after** the save, not just as a
  `blob:` preview before it — that's the difference between the Worker serving the scan and
  the page reaching for the production bucket.
- Edit a poem, reorder its images, remove one, save. Confirm the removed file is gone and
  the survivors kept their order.
- Delete a poem, then check it is recoverable per whatever
  [ticket 04](.scratch/kavita-next/issues/04-destructive-action-safety.md) settles on.
- Open two browser tabs, edit a different poem in each, and save both quickly. Without
  compare-and-swap the second save silently discards the first. This is the exact bug
  [ticket 02](.scratch/kavita-next/issues/02-poem-store-and-concurrency.md) fixes, and the
  test that proves the fix.

### Against real R2, safely

`wrangler dev --remote` runs on Cloudflare's edge with real R2 — but `wrangler.jsonc` sets
`preview_bucket_name: "kavita-dev"`, so it reads and writes a **throwaway bucket**, never
the real `kavita` one.

```bash
npx wrangler r2 bucket create kavita-dev   # once
cd worker && npm run dev:remote
```

Use this only when local simulation isn't faithful enough — real R2 semantics, etags, and
the 1-write-per-second per-key limit only show up here.

---

## 2. The app in a browser

```bash
npx expo start --web
```

By default this reads the **live** `poems.json` from R2 — fine for reading, and it cannot
write anything. To point the app at your local Worker instead:

```bash
EXPO_PUBLIC_POEMS_URL=http://localhost:8787/poems \
EXPO_PUBLIC_SCANS_URL=http://localhost:8787/scans \
npx expo start --web
```

Now a poem saved in the local admin shows up in the app on refresh, end to end, with nothing
live involved — scans included, since the Worker serves `/scans/:name` from whichever bucket
it's bound to.

**Worth checking by hand:**

- **Copy** on a poem puts Gurmukhi Unicode on the clipboard, whichever way the script toggle
  is set. Paste it somewhere to confirm it isn't Akhar ASCII.
- **Pinch-to-zoom** on the body text resizes as your fingers move and stays put after you
  release. Leave the poem and come back — the size should persist. On a trackpad, pinch works
  in browsers that send the gesture; the A−/A+ buttons are the fallback.
- A poem with only Gurmukhi, and one with only Roman, both render without the script toggle.

---

## 3. The production web build

The dev server is not the thing that gets deployed. `wrangler pages dev` serves the real
`dist/` with `_redirects` and `_headers` applied, which is the only way to catch a broken
redirect before it's live.

```bash
npm run build:web
npx wrangler pages dev dist
```

**The two things this catches and nothing else does:**

- Open `http://localhost:8788/poem/<some-id>` **directly** — not by clicking through from the
  list. It must render the poem, not a 404. That exercises the `/poem/* → /poem-shell.html`
  rule in `public/_redirects`; a plain `npx serve dist` would 404 here and you'd ship it.
- Open a poem id that does not exist. It should settle on "Poem not found" rather than
  hanging on "Loading…".

Then, and only then:

```bash
npm run deploy:web
cd worker && npx wrangler deploy
```

---

## Verifying what is actually live

The Worker does not deploy itself, and in August 2026 production was found running four
commits behind. Confirm the deploy took:

```bash
curl -s https://kavita-admin.<subdomain>.workers.dev/app.js | wc -l   # compare with local
curl -s https://kavita-admin.<subdomain>.workers.dev/ | grep -c copy-btn
```
