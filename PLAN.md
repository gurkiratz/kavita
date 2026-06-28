# Kavita — Plan

A personal, **offline-first** app (with a free web build) to browse, read, and search a small
collection (~10) of Punjabi poems. Image-forward. Just for me. No backend, accounts, SEO, or sharing.

> Status: planning. This doc is the source of truth for decisions; edit as we build.

---

## Locked decisions

| Area            | Decision |
|-----------------|----------|
| Content model   | Static, curated by me. **No backend / DB / auth.** |
| Platform        | **Expo + Expo Router + TypeScript** → native app (app-first, offline) **and** a free web build from one codebase. |
| Offline         | **Hard requirement.** Everything bundled (poems + scans). No network, ever. **No UploadThing / remote assets.** |
| Language layers | Gurmukhi (Unicode) + Roman transliteration + original scan. **No** English meaning-translation. |
| Mandatory field | Only **`title`**. Image, Gurmukhi, Roman, poet, source, tags are all optional. |
| Reader layout   | **Image is the hero** (tap-to-zoom) → Gurmukhi below (with Roman toggle) → `source` as a small caption. Degrades gracefully for any subset present (image-only, text-only, or both). |
| Search          | One smart box. Auto-detects script. **Strict** substring match + minimal normalization (lowercase, strip diacritics on Roman). Searches title + body (whichever layers exist). AND-combined with active tag filter. |
| v1 scope        | Browse list → read poem → search → **filter by tags**. Nothing else. |
| Authoring       | **Edit `data/poems.json` in the repo** (paste transcription, drop scan in `assets/scans/`, rebuild). Single source of truth for both app + web. |
| Fonts           | Default to **system fonts** — the text is Unicode, so the OS renders Gurmukhi via fallback. Bundle a Gurmukhi font **only later** during the theme pass, for consistency/look, not correctness. |

### Explicitly deferred (not in v1)
Aesthetics / font finalization, switchable backgrounds, favorites/bookmarks, English meaning-translation,
app-store (EAS) publishing.

---

## Data model

`data/poems.json` — single bundled array. Per poem:

```jsonc
{
  "id": "dittha-bajan-walia",
  "title":    { "gurmukhi": "…", "roman": "…" }, // REQUIRED
  "image":    "dittha.jpg",   // optional — filename only; resolved via imageMap
  "gurmukhi": "line\nline\n\nnext stanza…", // optional — line breaks preserved verbatim
  "roman":    "line\nline\n\nnext stanza…", // optional — powers Roman search
  "poet":     "",             // optional
  "source":   "",             // optional — attribution/record caption
  "tags":     []
}
```

---

## Project structure

```
app/
  _layout.tsx        // fonts + theme
  index.tsx          // home: search + tag filter + list
  poem/[id].tsx      // reader: image hero → Gurmukhi (Roman toggle) → source
components/
  PoemCard.tsx       // list item: thumbnail + Gurmukhi title
  SearchBar.tsx
  TagFilter.tsx      // chips, AND-combined with search
  ZoomableImage.tsx  // tap-to-zoom hero scan
data/poems.json
lib/
  types.ts
  search.ts          // script-detect + normalize + strict substring
  imageMap.ts        // static require() map: filename -> require("../assets/scans/<file>")
assets/{scans,fonts}/
```

---

## The two things that need real care

1. **Search (`lib/search.ts`)** — detect script by Unicode range (Gurmukhi `U+0A00–U+0A7F` vs Latin);
   lowercase + strip diacritics on the Roman side; strict substring match across `title.gurmukhi`,
   `title.roman`, `gurmukhi`, `roman` (whichever exist); then AND with any active tag.
   Poems with no transcription are findable by title + tags only.
2. **Reader** — image hero (tap-to-zoom) → Gurmukhi block with Roman toggle → `source` caption.
   Must render nukta (ਜ਼), addhak (ਕੱਲਾ/ਅੱਖ), Punjabi danda (।), quoted pen-name ('ਸਫਰੀ') correctly.

## Known gotcha (handled)

- React Native can't `require()` a **dynamic** path, so bundled scans need a small **static require map**
  (`lib/imageMap.ts`) keyed by filename. That's why `image` stores just `"dittha.jpg"`. ~10 lines; generated/maintained for me.

---

## Build order

1. Scaffold Expo Router + TS; list + reader rendering the one real seed poem (hardcoded).
2. Move to `data/poems.json` + `lib/imageMap.ts`; bundle the scan; confirm the seed renders perfectly
   (the nukta/addhak/danda check) on iOS, Android, web.
3. Search + tag filter on the home screen.
4. Reader polish: image-hero zoom + Roman toggle + source caption + graceful empty states.
5. Theme / switchable backgrounds (revisit deferred aesthetics here; decide on a bundled font).
6. Verify web build; EAS native builds when I want it on my phone.

---

## Seed fixture (first poem)

The real sample, mapped to the schema. (Body shown with real line breaks for readability; in JSON these
become `\n`. `source` extracted out of the body. Roman = transliteration, not meaning.)

- **id:** `dittha-bajan-walia`
- **title.gurmukhi:** ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ ਇਸ਼ਾਰਾ ਤੇਰੀ ਅੱਖ ਦਾ
- **title.roman:** Dittha Bajan Walia Ishara Teri Akh Da
- **source:** ਰਿਕਾਰਡ - ਸਰੂਪ ਸਿੰਘ ਨਵਾਂ ਸ਼ਹਿਰ ਵਾਲਿਆਂ ਦੀ ਆਵਾਜ਼

**gurmukhi:**
```
ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ,
ਇਸ਼ਾਰਾ ਤੇਰੀ ਅੱਖ ਦਾ।
ਕੱਲਾ ਕੱਲਾ ਸਿੰਘ,
ਤੇ ਜਨਾਜ਼ਾ ਲੱਖ ਦਾ।

ਪਿਤਾ ਦਸਮੇਸ਼ ਦੀਨ ਦੁਖੀਆਂ ਦਾ ਵਾਲੀ ਏ।
ਜੋਤ ਉਹਦੀ ਸਾਰੇ ਸੰਸਾਰ ਤੋਂ ਨਿਰਾਲੀ ਏ।
ਚੰਨ ਜਿਵੇਂ ਹੁੰਦਾ ਸੋਹਣਾ ਚੌਧਵੀਂ ਦੇ ਪੱਖ ਦਾ।
ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ ਇਸ਼ਾਰਾ ਤੇਰੀ ਅੱਖ ਦਾ।
ਕੱਲਾ ਕੱਲਾ ਸਿੰਘ...........

ਸੋਧ ਅਰਦਾਸਾ ਦਸਮੇਸ਼ ਨੂੰ ਧਿਆ ਕੇ।
ਜ਼ਾਲਮ ਦੇ ਸੀਸ ਨਾਲ ਤੇਗ ਨੂੰ ਉਠਾ ਕੇ।
ਦੀਪ ਸਿੰਘ ਡਿੱਠਾ ਸੀਸ ਤਲੀ ਉੱਤੇ ਰੱਖਦਾ।
ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ ਇਸ਼ਾਰਾ ਤੇਰੀ ਅੱਖ ਦਾ।
ਕੱਲਾ ਕੱਲਾ ਸਿੰਘ...........

ਪਾਹੁਲ ਤੂੰ ਪਿਲਾਈ ਦਾਤਾ ਜਿਹਨੂੰ ਖੰਡੇ ਧਾਰ ਦੀ।
ਮੌਤ ਵੀ ਅਗਾੜੀ ਉਹਦੇ ਦਮ ਨਹੀਉਂ ਮਾਰਦੀ।
ਤੇਗ ਨਾਲ ਗਿਉਂ ਲਹੂ ਵੈਰੀਆਂ ਦਾ ਚੱਖਦਾ।
ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ ਇਸ਼ਾਰਾ ਤੇਰੀ ਅੱਖ ਦਾ।
ਕੱਲਾ ਕੱਲਾ ਸਿੰਘ...........

'ਸਫਰੀ' ਜਿਨ੍ਹਾਂ ਵੀ ਮੱਥਾ ਗੁਰਾਂ ਨਾਲ ਲਾਇਆ ਏ।
ਕਰਕੇ ਕਸੂਰ ਪਿਛੋਂ ਬੜਾ ਪਛਤਾਇਆ ਏ।
ਲੱਖੋਂ ਹੋ ਕੇ ਰਹਿ ਗਿਆ ਔਰੰਗਜ਼ੇਬ ਕੱਖ ਦਾ।
ਡਿੱਠਾ ਬਾਜ਼ਾਂ ਵਾਲਿਆ ਇਸ਼ਾਰਾ ਤੇਰੀ ਅੱਖ ਦਾ।
ਕੱਲਾ ਕੱਲਾ ਸਿੰਘ...........
```

**roman:**
```
Dittha bajan walia,
Ishara teri akh da.
Kalla kalla singh,
Te janaza lakh da.

Pita Dasmesh deen dukhian da wali e.
Jot uhdi sare sansar ton nirali e.
Chann jiven hunda sohna chaudhvin de pakh da.
Dittha bajan walia ishara teri akh da.
Kalla kalla singh...........

Sodh ardasa Dasmesh nu dhia ke.
Zalam de sees naal teg nu utha ke.
Deep Singh dittha sees tali utte rakhda.
Dittha bajan walia ishara teri akh da.
Kalla kalla singh...........

Pahul tun pilai data jihnu khande dhar di.
Maut vi agari uhde dam nahiun mardi.
Teg naal giun lahu vairian da chakhda.
Dittha bajan walia ishara teri akh da.
Kalla kalla singh...........

'Safri' jinhan vi mattha guran naal laia e.
Karke kasoor pichhon bara pachhtaia e.
Lakhon ho ke reh gia Aurangzeb kakh da.
Dittha bajan walia ishara teri akh da.
Kalla kalla singh...........
```
