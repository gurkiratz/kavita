/** A piece of text available in both scripts. */
export type LocalizedText = {
  gurmukhi: string;
  roman: string;
};

/**
 * A single poem. Only `id` and `title` are guaranteed; everything else is
 * optional so a poem can be added as just a title (and image) and transcribed later.
 */
export type Poem = {
  id: string;
  title: LocalizedText;
  /** A single scan filename (assets/scans), resolved via lib/imageMap. */
  image?: string;
  /** Multiple scan filenames, shown stacked vertically. Takes precedence over `image`. */
  images?: string[];
  /** Gurmukhi body. Line breaks (\n) and blank lines (\n\n) are preserved. */
  gurmukhi?: string;
  /** Roman transliteration body. Powers Roman search. */
  roman?: string;
  /** Optional poet/author. */
  poet?: string;
  /** Optional attribution / recording credit, shown as a caption. */
  source?: string;
  /** Optional filter labels; omit or leave empty when none apply. */
  tags?: string[];
};
