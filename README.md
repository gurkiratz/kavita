# ਕਵਿਤਾ · Kavita

A small archive of Punjabi poetry — scanned handwritten pages alongside Gurmukhi
transcriptions and Roman transliterations. It runs as an iOS app, an Android app, and a
website, all reading the same collection.

**[Read it on the web](https://kavita-cab.pages.dev)** · **[Admin](https://kavita-admin.gurkiratz.workers.dev)**

## Why this exists

Poems written by hand in notebooks aren't readable by anyone who doesn't have the
notebook, and a photo of a page isn't searchable. Kavita keeps both: the scan, so the
handwriting survives, and the transcription, so the words can be searched, resized,
copied and shared.

Two design choices follow from that, and most of the code exists to honour them:

- **Offline first.** A poem you've opened before opens again on a train with no signal.
  The app ships with a bundled copy of the collection, caches the newest one it has
  fetched, and only then goes to the network — in that order of precedence.
- **Publishing shouldn't need a release.** Poems live in a file on Cloudflare R2, not in
  the app bundle. Adding one through the [admin page](https://kavita-admin.gurkiratz.workers.dev)
  makes it appear on every surface without an app store review or a web deploy.

## How it fits together

```
                    ┌──────────────────────┐
   admin (write) ──▶│  R2 bucket: kavita   │◀── app + web (read)
                    │  poems.json          │
                    │  scans/              │
                    │  trash/  history/    │
                    └──────────────────────┘
```

| Piece | Lives in | Deployed as |
|---|---|---|
| iOS / Android / web app | [`src/`](src/) | EAS builds + [Cloudflare Pages](https://kavita-cab.pages.dev) |
| Admin (add & edit poems) | [`worker/`](worker/) | [Cloudflare Worker](https://kavita-admin.gurkiratz.workers.dev) |
| The collection itself | R2 bucket `kavita` | `poems.json` + `scans/` |

Inside the app:

- [`src/app/`](src/app/) — routes. [`index.tsx`](src/app/index.tsx) is the collection,
  [`poem/[id].tsx`](src/app/poem/%5Bid%5D.tsx) is one poem.
- [`src/context/`](src/context/) — poems (with the offline precedence above), text size,
  keep-awake, toasts.
- [`src/lib/`](src/lib/) — remote fetch and cache, cross-script search, image resolution.
- [`src/components/`](src/components/) — the grid and index layouts, the scan viewer,
  the header.

## Other docs

- **[AUTHORING.md](AUTHORING.md)** — the poem format, how to add and edit poems, how
  publishing works, trash and recovery, deploy commands.
- **[TESTING.md](TESTING.md)** — how to exercise all of this locally without touching
  the live collection. **Read this before deploying anything.**
- **[AGENTS.md](AGENTS.md)** — notes for coding agents.

---

# Setup

Requires [Node.js](https://nodejs.org) 20+. Deploying also needs a
[Cloudflare account](https://dash.cloudflare.com) and, for the mobile apps, an
[Expo account](https://expo.dev).

```bash
git clone git@github.com:gurkiratz/kavita.git
cd kavita
npm install
```

The app reads the live collection out of the box — no credentials needed to run it.

## Run the app

```bash
npm run web       # browser
npm run ios       # iOS simulator or device (macOS + Xcode)
npm run android   # Android emulator or device (Android Studio)
npm start         # dev server, pick a target from the menu
```

`ios` and `android` build the native project, so the first run is slow. They need Xcode
and Android Studio respectively; `web` needs neither.

## Run the admin worker

```bash
cd worker
npm install
npm run seed:local   # copy the current poems.json into a simulated local bucket
npm run dev          # http://localhost:8787
```

`wrangler dev` simulates R2 on disk, so saving and deleting work and **nothing reaches
Cloudflare**. Set a local password by creating `worker/.dev.vars`:

```
ADMIN_TOKEN=whatever-you-like-locally
```

To point the app at your local worker instead of the live collection:

```bash
EXPO_PUBLIC_POEMS_URL=http://localhost:8787/poems \
EXPO_PUBLIC_SCANS_URL=http://localhost:8787/scans \
npm run web
```

See [TESTING.md](TESTING.md) for the full loop, including testing against real R2 with a
throwaway bucket.

---

# Deploy

## Web

```bash
npm run deploy:web
```

Exports the static site, post-processes it for Cloudflare Pages, and uploads. First time
only:

```bash
npx wrangler login
npx wrangler pages project create kavita --production-branch main
```

`app.json` sets `web.output: "static"`, so every route is prerendered.
[`public/_redirects`](public/_redirects) maps `/poem/*` onto the dynamic-route shell so a
direct link to any poem resolves — test that with `npx wrangler pages dev dist` before
deploying, since the dev server won't catch a broken redirect.

**A new poem does not need a web deploy.** The page fetches `poems.json` on load. Deploy
only when the app's *code* changes.

## Admin worker

```bash
cd worker
npx wrangler deploy
```

First time only — register a workers.dev subdomain when prompted, then set the password:

```bash
npx wrangler secret put ADMIN_TOKEN
```

> **The worker does not deploy itself.** Editing anything under `worker/`, including the
> static files in `worker/public/`, changes nothing live until you run `wrangler deploy`.
> Production was once found running four commits behind. Verify with:
>
> ```bash
> curl -s https://kavita-admin.gurkiratz.workers.dev/app.js | wc -l   # compare to local
> ```

Also worth setting once, so deleted poems and old revisions don't accumulate forever:

```bash
npx wrangler r2 bucket lifecycle add kavita expire-trash   trash/   --expire-days 30
npx wrangler r2 bucket lifecycle add kavita expire-history history/ --expire-days 30
```

## iOS and Android

Builds run on [EAS](https://docs.expo.dev/build/introduction/); profiles are in
[`eas.json`](eas.json).

```bash
npm install -g eas-cli
eas login

eas build --profile preview    --platform android   # installable APK for testing
eas build --profile production --platform ios
eas build --profile production --platform android
```

Then submit:

```bash
eas submit --platform ios
eas submit --platform android
```

`production` has `autoIncrement`, so build numbers look after themselves. Bump
`expo.version` in [`app.json`](app.json) for a user-visible version change.

---

## Conventions worth knowing before editing

- **Expo SDK 54.** Read the [versioned docs](https://docs.expo.dev/versions/v54.0.0/)
  rather than the latest ones — the API has moved.
- **Gurmukhi has two encodings here.** The admin form takes GurbaniAkhar ASCII (a legacy
  font encoding) because that's what's comfortable to type; R2 stores Unicode. Anything
  touching Punjabi text should say which one it means.
- **The admin is deliberately plain.** Vanilla JS, no build step, no framework. Keep it
  that way unless there's a reason not to.
- **Colours live in one place per surface** — `src/constants/theme.ts` for the app, the
  `:root` blocks in `worker/public/styles.css` for the admin. No raw hex elsewhere.
