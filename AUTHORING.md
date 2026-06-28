# Authoring poems

Everything you need to add, edit, or remove poems. No backend — poems are plain data
files bundled into the app, so the same content shows up on the app **and** the web build,
fully offline.

## Where things live

| What | Where |
|------|-------|
| All poem text + metadata | [`src/data/poems.json`](src/data/poems.json) |
| Long Gurmukhi/Roman bodies | [`src/data/text/`](src/data/text/) |
| Register external text | [`src/lib/poemTextMap.ts`](src/lib/poemTextMap.ts) |
| Scan image files | [`assets/scans/`](assets/scans/) |
| Registering each image | [`src/lib/imageMap.ts`](src/lib/imageMap.ts) |
| The shape of a poem (types) | [`src/lib/types.ts`](src/lib/types.ts) |

## The poem shape

`poems.json` is a JSON **array** of poem objects:

```jsonc
{
  "id": "dittha-bajan-walia",                 // REQUIRED — unique, url-safe (kebab-case)
  "title": {                                  // REQUIRED
    "gurmukhi": "ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ…",
    "roman": "Dittha Bajan Walia…"
  },
  "image":  "dittha-bajan-walia.jpg",         // optional — a single scan
  "images": ["page-1.jpg", "page-2.jpg"],     // optional — multiple scans (takes precedence)
  "gurmukhi": "…",                            // optional — Gurmukhi body
  "roman":    "…",                            // optional — Roman transliteration body
  "poet":     "",                             // optional
  "source":   "",                             // optional — credit/recording caption
  "tags":     ["Itihaas", "Veer Ras"]         // optional — filter labels
}
```

**Only `id` and `title` are required.** Everything else is optional, so you can add a
poem as just a title (and image) and fill in the transcription later.

### Long poem bodies (paste-friendly)

JSON can't contain real line breaks, so for long Gurmukhi/Roman text use a separate file:

| What | Where |
|------|-------|
| Metadata (title, images, id…) | [`src/data/poems.json`](src/data/poems.json) |
| Long Gurmukhi body | [`src/data/text/<id>.gurmukhi.ts`](src/data/text/) |
| Long Roman body | [`src/data/text/<id>.roman.ts`](src/data/text/) |
| Register external text | [`src/lib/poemTextMap.ts`](src/lib/poemTextMap.ts) |

Open `src/data/text/bhai-saida.gurmukhi.ts` as an example — paste your text **inside the backticks** with normal line breaks. No `\n` needed.

```ts
export default `ਪਹਿਲੀ ਸਤਰ।
ਦੂਜੀ ਸਤਰ।

ਨਵਾਂ ਬੰਦ।`;
```

Then add the poem id to `poemTextMap.ts`. Short poems can still use `"gurmukhi": "…"` inline in JSON with `\n` for line breaks.

### Short inline text in JSON
For brief bodies, JSON strings still work — use `\n` for a line break and `\n\n` for a blank line:

```json
"gurmukhi": "ਪਹਿਲੀ ਸਤਰ।\nਦੂਜੀ ਸਤਰ।\n\nਨਵਾਂ ਬੰਦ।"
```

### About `id`
It must be **unique** and **url-safe** (kebab-case) — it becomes the URL `/poem/<id>` and the
React key. Don't reuse an existing `id`.

---

## Recipes

### Edit an existing poem's text
Open [`src/data/poems.json`](src/data/poems.json), find the poem, edit any field. Remember `\n`
for line breaks.

### Add a brand-new poem
Append a new object to the array. Minimum viable poem:

```json
{
  "id": "meri-navi-kavita",
  "title": { "gurmukhi": "ਮੇਰੀ ਨਵੀਂ ਕਵਿਤਾ", "roman": "Meri Navi Kavita" }
}
```

Then add `gurmukhi` / `roman` / images / tags whenever you have them. New tags automatically
appear as filter chips on the home screen.

### Add a scan image
Two steps (React Native can't load an image from a dynamic path, so each must be registered):

1. Drop the file in `assets/scans/`, e.g. `assets/scans/dittha-bajan-walia.jpg`
2. Register it in [`src/lib/imageMap.ts`](src/lib/imageMap.ts):

   ```ts
   const scans: Record<string, number> = {
     "dittha-bajan-walia.jpg": require("../../assets/scans/dittha-bajan-walia.jpg"),
   };
   ```
3. Point the poem at it in `poems.json`:

   ```json
   "image": "dittha-bajan-walia.jpg"
   ```

### Add multiple images to one poem
Register each file (step 2 above), then use the `images` array. Order = display order — top to
bottom in the poem, left to right when swiping fullscreen:

```json
"images": ["dittha-page-1.jpg", "dittha-page-2.jpg", "dittha-page-3.jpg"]
```

`images` takes precedence over `image`, so you can remove the single `image` field once you
switch to an array.

### Replace an image
Either overwrite the file in `assets/scans/` with the same filename (no other change needed),
or add the new file, register it, and update the `image` / `images` reference.

### Remove a poem
Delete its object from the array in `poems.json`. (Optionally delete its scan from
`assets/scans/` and its line in `imageMap.ts`.)

---

## How display & search behave

- **Reader:** images show first (full-width, uncropped, stacked vertically; tap to open a
  swipeable fullscreen viewer), then the Gurmukhi body with a **ਪੰਜਾਬੀ / Roman** toggle (the
  toggle only appears when both scripts exist), then the `source` caption.
- **Search** (single box, auto-detects script):
  - Type **Gurmukhi** → matches the Gurmukhi title + body.
  - Type **Roman/English letters** → matches the Roman title + body.
  - Strict substring match (case- and accent-insensitive); it does **not** fix spelling, so keep
    your Roman spellings consistent.
- **Tags:** tapping chips filters to poems carrying **all** selected tags (AND), combined with
  the search box.

---

## After editing

The Expo dev server hot-reloads `poems.json` edits. If a change doesn't show — especially a
**new `require(...)` in `imageMap.ts`** — press **`r`** in the Expo terminal to reload, or
restart `npx expo start`.

A stray missing comma or quote will break the whole app. Edit in an editor that flags JSON
errors (e.g. VS Code), or paste the poem to Claude and have it generate the entry (line-break
escaping + image registration) for you.
