export interface MeaningSense {
  pos: string;
  definition: string;
  example?: string;
}

export interface WordMeaningData {
  matchedTitle: string;
  senses: MeaningSense[];
  synonyms: string[];
  english?: string;
  source: "my.wiktionary" | "en.wiktionary";
}

const MEMORY_CACHE = new Map<string, WordMeaningData | null>();
const INFLIGHT_CACHE = new Map<string, Promise<WordMeaningData | null>>();
const SESSION_MISS_PREFIX = "mm_orthography_meaning_miss_v1:";
const LOCAL_MEANING_STORE_KEY = "mm_orthography_meaning_store_v1";
const MAX_PERSISTED_MEANINGS = 400;

interface PersistedMeaningEntry {
  key: string;
  data: WordMeaningData;
  updatedAt: number;
}

const MY_POS_HEADERS = new Set([
  "နာမ်",
  "ကြိယာ",
  "နာမဝိသေသန",
  "ကြိယာဝိသေသန",
  "နာမ်စား",
  "ဝိဘတ်",
  "သမ္ဗန္ဓ",
  "ပစ္စည်း",
  "အာမေဍိတ်",
  "ဥပသာရ",
  "အတိုကောက်",
  "စကားပုံ",
  "ဝေါဟာရ",
]);

const EN_POS_TO_MY: Record<string, string> = {
  Noun: "နာမ်",
  "Proper noun": "နာမ်",
  Verb: "ကြိယာ",
  Adjective: "နာမဝိသေသန",
  Adverb: "ကြိယာဝိသေသန",
  Pronoun: "နာမ်စား",
  Particle: "ပစ္စည်း",
  Postposition: "ဝိဘတ်",
  Conjunction: "သမ္ဗန္ဓ",
  Interjection: "အာမေဍိတ်",
  Proverb: "စကားပုံ",
  Idiom: "ဝေါဟာရ",
};

const REGISTER_MARKERS = new Set([
  "current",
  "archaic",
  "colloquial",
  "figurative",
  "poetic",
  "obsolete",
  "slang",
  "rare",
  "literary",
  "honorific",
]);

function hasMyanmarChars(text: string): boolean {
  return /[\u1000-\u104F]/.test(text);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses plain-text MediaWiki extract from my.wiktionary.org (sourced from Myanmar Language Commission dictionaries).
 */
export function parseMyWiktionaryExtract(
  title: string,
  extract: string
): WordMeaningData | null {
  if (!extract || !extract.trim()) return null;

  const senses: MeaningSense[] = [];
  let synonyms: string[] = [];
  let english: string | undefined;

  // Split by level-3 or level-4 headings: === Heading === or ==== Subheading ====
  const sectionRe = /^(={3,4})\s*([^=\n]+?)\s*\1\s*$/gm;
  const sections: { level: number; heading: string; body: string }[] = [];
  let lastIndex = 0;
  let lastHeading = "";
  let lastLevel = 0;
  let match: RegExpExecArray | null;

  while ((match = sectionRe.exec(extract)) !== null) {
    if (lastHeading) {
      sections.push({
        level: lastLevel,
        heading: lastHeading,
        body: extract.slice(lastIndex, match.index).trim(),
      });
    }
    lastLevel = match[1].length;
    lastHeading = match[2].trim();
    lastIndex = sectionRe.lastIndex;
  }
  if (lastHeading) {
    sections.push({
      level: lastLevel,
      heading: lastHeading,
      body: extract.slice(lastIndex).trim(),
    });
  }

  const headLineRe = new RegExp(
    `^${escapeRegExp(title)}(?:\\s*\\([A-Za-z0-9.:\\-\\s,/']+\\))?$`
  );

  for (const sec of sections) {
    // Clean out any trailing level-2 footer like "== ကိုးကား ==" inside the last section's body
    const cleanBody = sec.body.split(/^==\s+[^=]/m)[0].trim();
    if (!cleanBody) continue;

    if (sec.level === 3 && MY_POS_HEADERS.has(sec.heading)) {
      const rawLines = cleanBody
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      // Check if MLC register marker ("current", "archaic", etc.) is present
      const markerIndices: number[] = [];
      rawLines.forEach((l, idx) => {
        if (REGISTER_MARKERS.has(l.toLowerCase())) {
          markerIndices.push(idx);
        }
      });

      if (markerIndices.length > 0) {
        for (let m = 0; m < markerIndices.length; m++) {
          const start = markerIndices[m] + 1;
          const end =
            m + 1 < markerIndices.length ? markerIndices[m + 1] : rawLines.length;
          const block = rawLines
            .slice(start, end)
            .filter(
              (l) =>
                hasMyanmarChars(l) &&
                !headLineRe.test(l) &&
                !/\((?:n|v|adj|adv|part|pron|conj|prep|interj)\)|[+>]/i.test(l)
            );
          if (block.length > 0) {
            senses.push({
              pos: sec.heading,
              definition: block[0],
              example: block.length > 1 ? block[1] : undefined,
            });
          }
        }
      } else {
        // Fallback for manually authored Myanmar Wiktionary entries without "current" marker
        const filtered = rawLines.filter((line, idx) => {
          if (!hasMyanmarChars(line)) return false;
          if (headLineRe.test(line)) return false;
          if (/\((?:n|v|adj|adv|part|pron|conj|prep|interj)\)|[+>]/i.test(line)) {
            return false;
          }
          // Skip single-word root stem line right before a morphological formula line
          const nextLine = rawLines[idx + 1] ?? "";
          if (
            !line.includes("။") &&
            !line.includes(" ") &&
            /\((?:n|v|adj|adv|part)\)|\+/i.test(nextLine)
          ) {
            return false;
          }
          return true;
        });

        if (filtered.length > 0) {
          senses.push({
            pos: sec.heading,
            definition: filtered[0],
            example: filtered.length > 1 ? filtered[1] : undefined,
          });
        }
      }
    } else if (sec.heading === "ကြောင်းတူသံကွဲများ") {
      const items = cleanBody
        .replace(/\([^)]*\)/g, "")
        .split(/[,၊\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && hasMyanmarChars(s));
      synonyms = Array.from(new Set([...synonyms, ...items])).slice(0, 6);
    } else if (sec.heading === "အင်္ဂလိပ်") {
      const engLine = cleanBody
        .replace(/""+/g, "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join("; ");
      if (engLine) {
        english = engLine;
      }
    }
  }

  if (senses.length === 0 && !english) {
    return null;
  }

  return {
    matchedTitle: title,
    senses,
    synonyms,
    english,
    source: "my.wiktionary",
  };
}

/**
 * Fallback parser for en.wiktionary.org "== Burmese ==" plain-text extracts.
 */
export function parseEnWiktionaryExtract(
  title: string,
  extract: string
): WordMeaningData | null {
  if (!extract || !extract.includes("== Burmese ==")) return null;
  const burmesePart =
    extract.split("== Burmese ==")[1]?.split(/^==\s+[A-Z]/m)[0] ?? "";
  if (!burmesePart.trim()) return null;

  const senses: MeaningSense[] = [];
  const sectionRe = /^===\s*([^=\n]+?)\s*===\s*$/gm;
  const sections: { heading: string; body: string }[] = [];
  let lastIndex = 0;
  let lastHeading = "";
  let match: RegExpExecArray | null;

  while ((match = sectionRe.exec(burmesePart)) !== null) {
    if (lastHeading) {
      sections.push({
        heading: lastHeading,
        body: burmesePart.slice(lastIndex, match.index).trim(),
      });
    }
    lastHeading = match[1].trim();
    lastIndex = sectionRe.lastIndex;
  }
  if (lastHeading) {
    sections.push({
      heading: lastHeading,
      body: burmesePart.slice(lastIndex).trim(),
    });
  }

  for (const sec of sections) {
    const myPos = EN_POS_TO_MY[sec.heading];
    if (!myPos) continue;
    const lines = sec.body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    // Skip headword romanization line (first line usually contains "• (")
    const defLines = lines.filter(
      (l, idx) =>
        !(idx === 0 && (l.includes("•") || l.startsWith(title))) &&
        !l.startsWith("Synonyms:") &&
        !l.startsWith("Derived terms:")
    );
    if (defLines.length > 0) {
      senses.push({
        pos: myPos,
        definition: defLines.slice(0, 2).join("; "),
      });
    }
  }

  if (senses.length === 0) return null;
  return {
    matchedTitle: title,
    senses: [],
    synonyms: [],
    english: senses.map((s) => `(${s.pos}) ${s.definition}`).join(" · "),
    source: "en.wiktionary",
  };
}

async function querySingleWikiTitle(
  lang: "my" | "en",
  title: string
): Promise<WordMeaningData | null> {
  const endpoint = `https://${lang}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(
    title
  )}&format=json&origin=*`;

  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const firstPage = Object.values(pages)[0] as
    | { missing?: string; title?: string; extract?: string }
    | undefined;
  if (!firstPage || "missing" in firstPage || !firstPage.extract) {
    return null;
  }

  const resolvedTitle = firstPage.title || title;
  return lang === "my"
    ? parseMyWiktionaryExtract(resolvedTitle, firstPage.extract)
    : parseEnWiktionaryExtract(resolvedTitle, firstPage.extract);
}

function buildLookupCandidates(
  headword: string,
  expandedNotes: string[] = []
): string[] {
  const clean = headword.replace(/-$/g, "").trim();
  const candidates: string[] = [clean];

  // If botanical/zoological classifier suffix in orthography book (e.g. ကန်စွန်းပင် -> ကန်စွန်း, ကရကတ်ငှက် -> ကရကတ်)
  const classifierSuffixes = ["ပင်", "ရွက်", "သီး", "ပွင့်", "ငှက်", "ငါး"];
  for (const suf of classifierSuffixes) {
    if (clean.length > suf.length + 2 && clean.endsWith(suf)) {
      candidates.push(clean.slice(0, -suf.length));
    }
  }

  for (const exp of expandedNotes) {
    const cleanExp = exp.replace(/-$/g, "").trim();
    if (cleanExp) candidates.push(cleanExp);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function readPersistedMeaningStore(): PersistedMeaningEntry[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_MEANING_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readCachedMeaning(
  key: string
): { hit: boolean; value: WordMeaningData | null } {
  try {
    const store = readPersistedMeaningStore();
    const found = store.find((item) => item.key === key);
    if (found && found.data) {
      return { hit: true, value: found.data };
    }
    const missRaw = window.sessionStorage.getItem(SESSION_MISS_PREFIX + key);
    if (missRaw === "1") {
      return { hit: true, value: null };
    }
    return { hit: false, value: null };
  } catch {
    return { hit: false, value: null };
  }
}

function writeCachedMeaning(key: string, value: WordMeaningData | null) {
  try {
    if (value) {
      const existing = readPersistedMeaningStore().filter(
        (item) => item.key !== key
      );
      const updated: PersistedMeaningEntry[] = [
        { key, data: value, updatedAt: Date.now() },
        ...existing,
      ].slice(0, MAX_PERSISTED_MEANINGS);
      window.localStorage.setItem(
        LOCAL_MEANING_STORE_KEY,
        JSON.stringify(updated)
      );
      window.sessionStorage.removeItem(SESSION_MISS_PREFIX + key);
    } else {
      window.sessionStorage.setItem(SESSION_MISS_PREFIX + key, "1");
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function fetchWordMeaning(
  headword: string,
  expandedNotes: string[] = []
): Promise<WordMeaningData | null> {
  const cacheKey = headword.replace(/-$/g, "").trim();
  if (!cacheKey) return null;

  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey) ?? null;
  }

  if (typeof window !== "undefined") {
    const cached = readCachedMeaning(cacheKey);
    if (cached.hit) {
      MEMORY_CACHE.set(cacheKey, cached.value);
      return cached.value;
    }
  }

  const inflight = INFLIGHT_CACHE.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async (): Promise<WordMeaningData | null> => {
    const candidates = buildLookupCandidates(cacheKey, expandedNotes);
    try {
      for (const cand of candidates) {
        const myResult = await querySingleWikiTitle("my", cand);
        if (myResult) {
          MEMORY_CACHE.set(cacheKey, myResult);
          if (typeof window !== "undefined") writeCachedMeaning(cacheKey, myResult);
          return myResult;
        }
      }
      for (const cand of candidates.slice(0, 2)) {
        const enResult = await querySingleWikiTitle("en", cand);
        if (enResult) {
          MEMORY_CACHE.set(cacheKey, enResult);
          if (typeof window !== "undefined") writeCachedMeaning(cacheKey, enResult);
          return enResult;
        }
      }
      MEMORY_CACHE.set(cacheKey, null);
      if (typeof window !== "undefined") writeCachedMeaning(cacheKey, null);
      return null;
    } catch {
      return null;
    } finally {
      INFLIGHT_CACHE.delete(cacheKey);
    }
  })();

  INFLIGHT_CACHE.set(cacheKey, promise);
  return promise;
}
