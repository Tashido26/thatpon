import {
  DistinctionPair,
  orthographyDataset,
  RawDictEntry,
} from "../data/orthographyLoader";
import { normalizeMyanmarInput } from "./zawgyiNormalize";

export interface ExpandedEntry extends RawDictEntry {
  id: number;
  pdfPage: number;
  displayHeadword: string;
  expandedNotes: string[];
  strictPhonetic: string;
  loosePhonetic: string;
  openVowelSkeleton: string;
  syllableCount: number;
}

export interface SyllableDiffPart {
  syllable: string;
  changed: boolean;
}

export type MatchKind =
  | "exact"
  | "inflected_exact"
  | "khwe_correction"
  | "tat_ta_rule"
  | "particle_rule"
  | "expanded_usage"
  | "prefix"
  | "phonetic"
  | "contains"
  | "fuzzy";

export interface SearchResultItem {
  entry: ExpandedEntry;
  matchKind: MatchKind;
  score: number;
  reasonLabel: string;
  diff?: SyllableDiffPart[];
  relatedDistinction?: DistinctionPair;
}

export interface FocusedDistinction {
  id: number;
  c: string;
  t: DistinctionPair["t"];
  p: number;
  leftExcerpt: string;
  rightExcerpt: string;
}

export interface SmartSearchOutcome {
  rawQuery: string;
  normalizedQuery: string;
  wasZawgyi: boolean;
  hasExactMatch: boolean;
  resolvedInflection?: {
    queriedForm: string;
    baseHeadword: string;
    suffix: string;
  };
  primaryCorrection?: {
    wrongText: string;
    correctWords: string[];
    sourceType:
      | "khwe_misspelling"
      | "tat_ta"
      | "particle_rule"
      | "phonetic_auto";
    explanation: string;
    distinction?: DistinctionPair;
    primaryEntry?: ExpandedEntry;
    diff?: SyllableDiffPart[];
  };
  results: SearchResultItem[];
  homophoneAlternatives: ExpandedEntry[];
  relatedDistinctions: FocusedDistinction[];
}

export interface PhraseCheckToken {
  raw: string;
  cleanWord: string;
  status: "exact" | "correction" | "suggestion" | "punctuation";
  suggestions: string[];
  reason?: string;
  bookPage?: number;
}

/**
 * Normalizes common Myanmar diacritic ordering variations to standard Unicode order
 * without altering the visible spelling.
 */
function normalizeDiacriticOrder(s: string): string {
  return s
    .replace(/\u1037\u103A/g, "\u103A\u1037")
    .replace(/\u1038\u103A/g, "\u103A\u1038")
    .replace(/\u1036\u102F/g, "\u102F\u1036")
    .replace(/\u1037\u102F/g, "\u102F\u1037")
    .replace(/\u1037\u102D/g, "\u102D\u1037");
}

/**
 * Losslessly splits a Myanmar Unicode word into orthographic syllables.
 * Includes Great Sa ဿ (\u103F), Pali subscripts (္C), kinzi (င်္), and independent vowels.
 * Mathematically guarantees `splitMyanmarSyllables(w).join("") === w.trim()`.
 */
export function splitMyanmarSyllables(word: string): string[] {
  if (!word) return [];
  const clean = word.trim();
  if (!clean) return [];

  const sylRe =
    /(?:င်္)?[က-အဣဤဥဦဧဩဪဿ၌၍၎၏](?:္[က-အ])*(?:ာ်|ါ်|[ျြွှေိီုူဲါာံ့း])*(?:[က-အ](?:်[့း]?|[့း]်)(?![ျြွှေိီုူဲါာ္]))*/g;

  const out: string[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = sylRe.exec(clean)) !== null) {
    if (m.index > lastIdx) {
      const skipped = clean.slice(lastIdx, m.index);
      if (out.length > 0) {
        out[out.length - 1] += skipped;
      } else {
        out.push(skipped);
      }
    }
    out.push(m[0]);
    lastIdx = sylRe.lastIndex;
  }

  if (lastIdx < clean.length) {
    const tail = clean.slice(lastIdx);
    if (out.length > 0) {
      out[out.length - 1] += tail;
    } else {
      out.push(tail);
    }
  }

  return out.length > 0 ? out : [clean];
}

/**
 * Expands book note containing `~` with the headword, e.g.:
 * headword="ကတော့", note="ဆီ~" -> ["ဆီကတော့"]
 */
export function expandTildeNote(headword: string, note?: string): string[] {
  if (!note || !note.includes("~")) return [];
  return note
    .split(/[၊/]/)
    .map((part) =>
      part
        .replace(/~/g, headword)
        .replace(/\s+/g, "")
        .replace(/-$/g, "")
        .trim()
    )
    .filter(Boolean);
}

/**
 * Tone-preserving, vowel-accurate Burmese phonetic key:
 * - Unifies true homophone spellings (ါ/ာ, ဉာ/ညာ, ညဏ်/ဉာဏ်, ဿ/သ, ျ/ြ, ရ/ယ, ဏ/န, ဠ/လ)
 * - Unifies -ဲ with -ည်း (heavy tone) and -ဲ့ with -ည့် (creaky tone)
 * - Keeps distinct Burmese nasal rhymes separate:
 *   -င်/-ဉ် (iN) vs -န်/-မ်/-ံ/-ဏ် (aN) vs -ိန်/-ိမ် (eiN) vs -ုန်/-ုံ (ouN) vs -ွန်/-ွမ် (uN) vs -ောင် (auN) vs -ိုင် (aiN)
 * - Preserves tone marks (့ creaky, း heavy, unmarked level) so တွေ ≠ တွေ့ and သိပ္ပံ ≠ သီးပင်!
 */
export function toStrictPhoneticKey(word: string): string {
  let s = normalizeDiacriticOrder(word)
    .replace(/\s+/g, "")
    .replace(/[-()~၊။“”[\]?+]/g, "")
    .replace(/ဉာ/g, "ညာ")
    .replace(/ညာဏ်|ညဏ်/g, "ညာန်")
    .replace(/ဿ/g, "သ")
    .replace(/ဏ္ဌ|ဋ္ဌ/g, "ထ")
    .replace(/ဏ္ဍ/g, "ဒ")
    .replace(/ဏ္ဏ/g, "န")
    .replace(/ဏ/g, "န")
    .replace(/ဠ/g, "လ")
    .replace(/င်္/g, "င်")
    .replace(/([ိီုူေဲါာ])?[ကခဂဃစဆဇဈဋဌဍဎတထဒဓပဖဗဘသ]္([က-အ])/g, "$1K$2")
    .replace(/[ငဉနမ]္([က-အ])/g, "န်$1")
    .replace(/ါ/g, "ာ")
    .replace(/ြ/g, "ျ")
    .replace(/ရ/g, "ယ");

  // Unify -ဲ / -ည် with exact tone equivalence (-ဲ == -ည်း, -ဲ့ == -ည့်)
  s = s
    .replace(/ည်း/g, "Eး")
    .replace(/ည့်/g, "E့")
    .replace(/ည်/g, "E")
    .replace(/ဲ့/g, "E့")
    .replace(/ဲ/g, "Eး");

  // Normalize vowel + final combinations BEFORE plain finals
  s = s
    .replace(/ော်/g, "O")
    .replace(/ော့/g, "O့")
    .replace(/ော(?![့်းက-အ])/g, "Oး")
    .replace(/ောင်([့း]?)/g, "auN$1")
    .replace(/ောက်/g, "auK")
    .replace(/ိုင်([့း]?)/g, "aiN$1")
    .replace(/ိုက်/g, "aiK")
    .replace(/ိ[နမဏ]်([့း]?)|ိံ([့း]?)/g, "eiN$1$2")
    .replace(/ိ[တပဋဌဒဗ]်/g, "eiK")
    .replace(/ု[နမဏ]်([့း]?)|ုံ([့း]?)/g, "ouN$1$2")
    .replace(/ု[တပဋဌဒဗ]်/g, "ouK")
    .replace(/ွ[နမဏ]်([့း]?)|ွံ([့း]?)/g, "uN$1$2")
    .replace(/ွ[တပ]်/g, "uK")
    .replace(/[ငဉ]်([့း]?)/g, "iN$1")
    .replace(/[နမဏယဝလ]်([့း]?)|ံ([့း]?)/g, "aN$1$2")
    .replace(/စ်/g, "iK")
    .replace(/[ကခဂဃစဆဇဈဋဌဍဎတထဒဓပဖဗဘသဟ]်/g, "K");

  return s;
}

/**
 * Looser phonetic key for single-word search recovery when user omits tone marks or confuses
 * aspirated/unaspirated/voiced consonants (e.g. က/ဂ, စ/ဆ/ဇ/သ, တ/ဒ, ပ/ဖ/ဗ) while STILL keeping
 * distinct nasal vowels (-င် vs -န်/-ံ) from falsely colliding on unrelated words.
 */
export function toLoosePhoneticKey(word: string): string {
  const s = toStrictPhoneticKey(
    word.replace(/တစ်/g, "တ").replace(/လက်ဖက်/g, "လဖက်")
  )
    .replace(/[့းှ]/g, "")
    .replace(/ီ/g, "ိ")
    .replace(/ူ/g, "ု")
    .replace(/iK/g, "K")
    .replace(/[ခဂဃ]/g, "က")
    .replace(/[ဆဇဈသ]/g, "စ")
    .replace(/[ထဒဓဋဌဍဎ]/g, "တ")
    .replace(/[ဖဗဘ]/g, "ပ")
    .replace(/ည/g, "န");

  return s;
}

/**
 * Variant skeleton where `-ည်` maps to `-ီ` (`အချီးနှီး` -> `အချည်းနှီး`, `ပစ္စီး` -> `ပစ္စည်း`)
 * and drops medial `ျ`/`ြ` (`မနက်ဖန်` -> `မနက်ဖြန်`, `ကိန်းသေ` -> `ကျိန်းသေ`).
 */
export function toOpenVowelSkeleton(word: string): string {
  const preMapped = normalizeDiacriticOrder(word)
    .replace(/ည်း/g, "ီး")
    .replace(/ည့်/g, "ိ")
    .replace(/ည်/g, "ီ")
    .replace(/[ျြ]/g, "");
  return toStrictPhoneticKey(preMapped);
}

/**
 * Fast bounded Levenshtein edit distance on codepoint arrays.
 */
export function editDistance(a: string, b: string, maxDist = 4): number {
  const ca = Array.from(a);
  const cb = Array.from(b);
  const la = ca.length;
  const lb = cb.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lb; j++) {
      const cost = ca[i - 1] === cb[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

/**
 * Computes syllable-level diff on `correctWord` and guarantees `parts.map(p => p.syllable).join("") === correctWord`.
 */
export function computeSpellingDiff(
  queriedWord: string,
  correctWord: string
): SyllableDiffPart[] {
  const qSyls = splitMyanmarSyllables(queriedWord);
  const cSyls = splitMyanmarSyllables(correctWord);

  let parts: SyllableDiffPart[];

  if (qSyls.length === cSyls.length) {
    parts = cSyls.map((syl, idx) => ({
      syllable: syl,
      changed: qSyls[idx] !== syl,
    }));
  } else {
    let qi = 0;
    parts = cSyls.map((syl) => {
      if (qi < qSyls.length && qSyls[qi] === syl) {
        qi++;
        return { syllable: syl, changed: false };
      }
      const nextMatchInQ = qSyls.indexOf(syl, qi);
      if (nextMatchInQ !== -1 && nextMatchInQ - qi <= 1) {
        qi = nextMatchInQ + 1;
        return { syllable: syl, changed: false };
      }
      if (qi < qSyls.length && cSyls.length > qSyls.length) {
        if (qi + 1 < qSyls.length && cSyls.includes(qSyls[qi + 1])) {
          qi++;
        }
      } else if (qi < qSyls.length) {
        qi++;
      }
      return { syllable: syl, changed: true };
    });
  }

  // Absolute lossless safety invariant: joined syllables MUST equal correctWord verbatim
  if (parts.map((p) => p.syllable).join("") !== correctWord) {
    return [{ syllable: correctWord, changed: queriedWord !== correctWord }];
  }

  return parts;
}

interface ParsedKhweItem {
  rawItem: string;
  tokens: string[];
}

function parseKhweItems(text: string): ParsedKhweItem[] {
  const items: ParsedKhweItem[] = [];
  const clauses = text
    .split(/[၊။]/)
    .map((s) => s.trim())
    .filter(Boolean);
  let lastHead = "";

  for (const cl of clauses) {
    const itemTokens: string[] = [];
    const parenMatch = cl.match(/^([^(]+?)\s*\(([^)]+)\)/);
    if (parenMatch) {
      const base = parenMatch[1].replace(/-$/g, "").replace(/\s+/g, "").trim();
      if (base) {
        lastHead = base;
        itemTokens.push(base);
      }
      const inside = parenMatch[2];
      if (inside.includes("~") && lastHead) {
        for (const sub of expandTildeNote(lastHead, inside)) {
          itemTokens.push(sub);
        }
      }
    } else {
      const clean = cl
        .replace(/\[[^\]]*\]/g, "")
        .replace(/[“”"]/g, "")
        .replace(/လည်းရှု$/g, "")
        .replace(/-$/g, "")
        .replace(/\s+/g, "")
        .trim();
      if (clean && !clean.includes("~")) {
        lastHead = clean;
        itemTokens.push(clean);
      } else if (clean.includes("~") && lastHead) {
        itemTokens.push(clean.replace(/~/g, lastHead));
      }
    }
    if (itemTokens.length > 0) {
      items.push({ rawItem: cl, tokens: itemTokens });
    }
  }
  return items;
}

function extractCleanTokensFromKhweText(text: string): string[] {
  const all = parseKhweItems(text).flatMap((i) => i.tokens);
  return Array.from(new Set(all.filter((w) => w.length >= 1)));
}

const BOTANICAL_SUFFIXES = ["ပင်", "ရွက်", "ဥ", "သီး", "ပွင့်", "ငှက်", "ငါး"];

function stripClassifierSuffix(word: string): string | null {
  for (const suf of BOTANICAL_SUFFIXES) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) {
      return word.slice(0, -suf.length);
    }
  }
  return null;
}

// High-precision classic Burmese orthographic misspellings
const CLASSIC_MISSPELLINGS: Record<string, { correct: string; reason: string }> =
  {
    ညဏ်: {
      correct: "ဉာဏ်",
      reason: "ပါဠိသက် “ဉာဏ” မှ ဆင်းသက်၍ ဉကလေး “ဉာဏ်” ဖြင့် ရေးရသည်။",
    },
    ညာဏ်: {
      correct: "ဉာဏ်",
      reason: "ပါဠိသက် “ဉာဏ” မှ ဆင်းသက်၍ ဉကလေး “ဉာဏ်” ဖြင့် ရေးရသည်။",
    },
    အဓိပ္ပါယ်: {
      correct: "အဓိပ္ပာယ်",
      reason: "“ပ္ပ” ဗျည်းဆင့်နောက်တွင် မောက်ချမဟုတ်ဘဲ ရေးချ “အဓိပ္ပာယ်” ဖြင့် ရေးရသည်။",
    },
    ပြသနာ: {
      correct: "ပြဿနာ",
      reason: "သကြီး “ဿ” ဖြင့် “ပြဿနာ” ဟု ရေးရသည်။",
    },
    ပြဿာနာ: {
      correct: "ပြဿနာ",
      reason: "ရေးချမပါဘဲ “ပြဿနာ” ဟု ရေးရသည်။",
    },
    ပတ်သတ်: {
      correct: "ပတ်သက်",
      reason: "ရှေ့ပုဒ် “ပတ်” (တသတ်)၊ နောက်ပုဒ် “သက်” (ကသတ်) ဖြင့် “ပတ်သက်” ဟု ရေးရသည်။",
    },
    ပက်သက်: {
      correct: "ပတ်သက်",
      reason: "ရှေ့ပုဒ် “ပတ်” (တသတ်) ဖြင့် “ပတ်သက်” ဟု ရေးရသည်။",
    },
    ပက်သတ်: {
      correct: "ပတ်သက်",
      reason: "“ပတ်သက်” ဟု ရေးရသည်။",
    },
  };

function makeNormalizedSet(items: string[]): Set<string> {
  return new Set(items.map((item) => normalizeDiacriticOrder(item)));
}

// Grammatical trailing suffixes stripped during inflected single-word search
const TRAILING_GRAMMAR_SUFFIXES = [
  "ခဲ့သည်",
  "ပါသည်",
  "ပါတယ်",
  "နေသည်",
  "နေတယ်",
  "ပြီးပြီ",
  "များကို",
  "တွေကို",
  "တွေနဲ့",
  "များနှင့်",
  "ခြင်း",
  "ချက်",
  "သည်",
  "သည့်",
  "တယ်",
  "တဲ့",
  "မည်",
  "မည့်",
  "မယ်",
  "ပြီ",
  "ပြီး",
  "ခဲ့",
  "များ",
  "တွေ",
  "တို့",
  "မှာ",
  "တွင်",
  "၌",
  "ကို",
  "သို့",
  "နှင့်",
  "နဲ့",
  "ဖြင့်",
  "ကြောင့်",
  "ဖို့",
  "ရန်",
  "မှု",
  "ပါ",
  "လား",
].map((s) => normalizeDiacriticOrder(s));

// Common unambiguous Burmese verbs whose root spelling may not need a standalone entry
const COMMON_UNAMBIGUOUS_VERBS = makeNormalizedSet([
  "သွား",
  "လာ",
  "စား",
  "ပြော",
  "သိ",
  "လုပ်",
  "ကြည့်",
  "ထိုင်",
  "နေ",
  "ဖြစ်",
  "ရှိ",
  "ရ",
  "ပေး",
  "ယူ",
  "ဖတ်",
  "ရေး",
  "ပြန်",
  "ဝင်",
  "ထွက်",
  "အိပ်",
  "ထ",
  "ပြေး",
  "မေး",
  "ဖြေ",
  "ဝယ်",
  "ရောင်း",
  "သောက်",
  "ဟုတ်",
  "နားထောင်",
  "စဉ်းစား",
  "ပြောဆို",
  "ရှင်းပြ",
  "ကြိုးစား",
  "ဂရုစိုက်",
  "သတိထား",
  "စစ်ဆေး",
  "ရှာဖွေ",
]);

const VERB_MODAL_SUFFIX_SYLLABLES = makeNormalizedSet([
  "နိုင်",
  "တတ်",
  "ရ",
  "ဝံ့",
  "သင့်",
  "ချင်",
  "ဖူး",
  "သေး",
  "တော့",
  "ခဲ့",
  "လိုက်",
  "သွား",
  "လာ",
  "နေ",
  "ကြ",
  "ပါ",
  "စေ",
  "တန်",
]);

// Nouns beginning with syllable "မ" that must NEVER be mistaken for negated verbs ("မ + V")
const NON_NEGATED_MA_WORDS = makeNormalizedSet([
  "မနက်",
  "မမ",
  "မကွေး",
  "မယား",
  "မသာ",
  "မဟာ",
  "မဏိ",
  "မရမ်း",
  "မလိုင်",
  "မန်ကျည်း",
  "မနော",
  "မနက်ဖြန်",
]);

// Non-container classifiers where "တစ် + C + ထဲ" is always a misspelling of "...တည်း"
const STRICT_TADEE_CLASSIFIERS = makeNormalizedSet([
  "ယောက်",
  "ဦး",
  "ပါး",
  "ကောင်",
  "မျိုး",
  "ကြိမ်",
  "ခါ",
  "ပြိုင်",
  "သံ",
  "စိတ်",
  "သဘော",
  "ဆက်",
  "ချိုး",
]);

// Semi-spatial classifiers where "တစ် + C + ထဲ" means "...တည်း" UNLESS followed by locative postposition
const NON_LOCATIVE_TADEE_CLASSIFIERS = makeNormalizedSet([
  "ခု",
  "ချက်",
  "ဖက်",
  "လက်စ",
]);

const LOCATIVE_FOLLOWERS = makeNormalizedSet([
  "မှာ",
  "တွင်",
  "၌",
  "က",
  "သို့",
  "ဝယ်",
  "ကနေ",
  "ထည့်",
  "ဝင်",
]);

// Clause-final experiential "ဖူး" followers where "မ + V + ဖူး + ..." is valid experiential aspect
const EXPERIENTIAL_PHU_FOLLOWERS = makeNormalizedSet([
  "ဘူး",
  "သေး",
  "ပါ",
  "သော",
  "သည့်",
  "တဲ့",
  "သူ",
  "ချေ",
  "ချည်",
  "လို့",
  "ကြောင်း",
  "သလား",
  "လား",
]);

// Interrogative stems that take "လဲ" (not "လည်း") in questions
const INTERROGATIVE_LAE_STEMS = makeNormalizedSet([
  "ဘာ",
  "ဘယ်သူ",
  "ဘယ်လို",
  "ဘယ်မှာ",
  "ဘယ်က",
  "ဘယ်ကို",
  "ဘယ်တော့",
  "ဘယ်အခါ",
  "ဘယ်လောက်",
  "ဘာကြောင့်",
  "ဘာဖြစ်လို့",
  "အဘယ်ကြောင့်",
  "ဘယ်နှခု",
  "ဘယ်နှစ်ခု",
  "ဘယ်နှယောက်",
]);

interface OrthographyIndex {
  entries: ExpandedEntry[];
  byExactWord: Map<string, ExpandedEntry[]>;
  byExpandedUsage: Map<string, ExpandedEntry[]>;
  byClassifierStem: Map<string, ExpandedEntry[]>;
  byStrictPhonetic: Map<string, ExpandedEntry[]>;
  byLoosePhonetic: Map<string, ExpandedEntry[]>;
  byOpenSkeleton: Map<string, ExpandedEntry[]>;
  verifiedKhweCorrectWords: Set<string>;
  attestedValidSpans: Set<string>;
  misspellingMap: Map<
    string,
    { pair: DistinctionPair; correctWords: string[] }
  >;
  distinctionByWord: Map<string, DistinctionPair[]>;
}

let cachedIndex: OrthographyIndex | null = null;

function addMulti<K, V>(map: Map<K, V[]>, key: K, val: V) {
  if (!key) return;
  const arr = map.get(key);
  if (arr) {
    arr.push(val);
  } else {
    map.set(key, [val]);
  }
}

// Everyday literary & colloquial Burmese morphemes/words that have unambiguous spelling
const STANDARD_UNAMBIGUOUS_WORDS = [
  "သည်",
  "၏",
  "ကို",
  "၌",
  "တွင်",
  "ဝယ်",
  "မှ",
  "က",
  "သို့",
  "နှင့်",
  "ဖြင့်",
  "ကြောင့်",
  "ဖို့",
  "ရန်",
  "အတွက်",
  "သော",
  "သည့်",
  "များ",
  "တို့",
  "လည်း",
  "ပင်",
  "သာ",
  "မူ",
  "ကား",
  "ပါ",
  "ခဲ့",
  "ပြီ",
  "ပြီး",
  "မည်",
  "နေ",
  "ကြ",
  "၍",
  "လျက်",
  "တော့",
  "ဦး",
  "ဘူး",
  "မ",
  "တဲ့",
  "ရဲ့",
  "တွေ",
  "နဲ့",
  "တယ်",
  "မယ်",
  "လဲ",
  "ပဲ",
  "ဘဲ",
  "ဟာ",
  "မှာ",
  "ကနေ",
  "လို့",
  "ပေါ့",
  "နော်",
  "ဗျာ",
  "ရှင်",
  "ဘာသာ",
  "ဘာသာပြန်",
  "အခါ",
  "ဖွင့်",
  "စစ်",
  "မူရင်း",
  "ပါဝင်",
  "အတည်ပြု",
  "အထူး",
  "သဖြင့်",
  "အထူးသဖြင့်",
  "သိပ္ပံ",
  "ဆိုင်ရာ",
  "ဥပမာ",
  "ဖြစ်",
  "ဖြစ်နိုင်ခြေ",
  "တွက်",
  "တွက်ချက်",
  "အကြောင်း",
  "ရှင်းပြ",
  "အရေးကြီး",
];

export function getOrthographyIndex(): OrthographyIndex {
  if (cachedIndex) return cachedIndex;

  const entries: ExpandedEntry[] = orthographyDataset.entries.map((raw, idx) => {
    const cleanW = normalizeDiacriticOrder(raw.w);
    const expandedNotes = expandTildeNote(cleanW, raw.n);
    const strictPhonetic = toStrictPhoneticKey(cleanW);
    const loosePhonetic = toLoosePhoneticKey(cleanW);
    const openVowelSkeleton = toOpenVowelSkeleton(cleanW);
    const syls = splitMyanmarSyllables(cleanW);
    return {
      ...raw,
      w: cleanW,
      id: idx + 1,
      pdfPage: raw.p + 50,
      displayHeadword: raw.v ? `${cleanW}-` : cleanW,
      expandedNotes,
      strictPhonetic,
      loosePhonetic,
      openVowelSkeleton,
      syllableCount: syls.length,
    };
  });

  const byExactWord = new Map<string, ExpandedEntry[]>();
  const byExpandedUsage = new Map<string, ExpandedEntry[]>();
  const byClassifierStem = new Map<string, ExpandedEntry[]>();
  const byStrictPhonetic = new Map<string, ExpandedEntry[]>();
  const byLoosePhonetic = new Map<string, ExpandedEntry[]>();
  const byOpenSkeleton = new Map<string, ExpandedEntry[]>();
  const attestedValidSpans = new Set<string>(STANDARD_UNAMBIGUOUS_WORDS);

  for (const e of entries) {
    addMulti(byExactWord, e.w, e);
    addMulti(byStrictPhonetic, e.strictPhonetic, e);
    addMulti(byLoosePhonetic, e.loosePhonetic, e);
    addMulti(byOpenSkeleton, e.openVowelSkeleton, e);
    attestedValidSpans.add(e.w);

    const syls = splitMyanmarSyllables(e.w);
    for (let k = 1; k < syls.length; k++) {
      const prefixSpan = syls.slice(0, k).join("");
      if (prefixSpan.length >= 2) {
        attestedValidSpans.add(prefixSpan);
      }
    }

    const stem = stripClassifierSuffix(e.w);
    if (stem) {
      addMulti(byClassifierStem, stem, e);
      attestedValidSpans.add(stem);
    }

    for (const exp of e.expandedNotes) {
      const normExp = normalizeDiacriticOrder(exp);
      addMulti(byExpandedUsage, normExp, e);
      addMulti(byStrictPhonetic, toStrictPhoneticKey(normExp), e);
      addMulti(byLoosePhonetic, toLoosePhoneticKey(normExp), e);
      attestedValidSpans.add(normExp);
    }
  }

  const verifiedKhweCorrectWords = new Set<string>();
  const misspellingMap = new Map<
    string,
    { pair: DistinctionPair; correctWords: string[] }
  >();
  const distinctionByWord = new Map<string, DistinctionPair[]>();

  for (const d of orthographyDataset.distinctions) {
    const leftTokens = extractCleanTokensFromKhweText(d.l).map(
      normalizeDiacriticOrder
    );
    const rightTokens = extractCleanTokensFromKhweText(d.r).map(
      normalizeDiacriticOrder
    );

    if (d.t === "misspelling") {
      leftTokens.forEach((wrongTok, i) => {
        const mappedCorrect =
          leftTokens.length === rightTokens.length && rightTokens[i]
            ? [rightTokens[i]]
            : rightTokens;
        misspellingMap.set(wrongTok, {
          pair: d,
          correctWords: mappedCorrect,
        });
        attestedValidSpans.delete(wrongTok);
      });
      for (const rightTok of rightTokens) {
        verifiedKhweCorrectWords.add(rightTok);
        attestedValidSpans.add(rightTok);
      }
    } else if (d.t === "compare" || d.t === "dual") {
      for (const tok of [...leftTokens, ...rightTokens]) {
        verifiedKhweCorrectWords.add(tok);
        attestedValidSpans.add(tok);
      }
    }

    for (const tok of [...leftTokens, ...rightTokens]) {
      addMulti(distinctionByWord, tok, d);
    }
  }

  for (const wrongKey of Object.keys(CLASSIC_MISSPELLINGS)) {
    attestedValidSpans.delete(wrongKey);
  }

  cachedIndex = {
    entries,
    byExactWord,
    byExpandedUsage,
    byClassifierStem,
    byStrictPhonetic,
    byLoosePhonetic,
    byOpenSkeleton,
    verifiedKhweCorrectWords,
    attestedValidSpans,
    misspellingMap,
    distinctionByWord,
  };
  return cachedIndex;
}

export function resetOrthographyIndexCache(): void {
  cachedIndex = null;
}

function resolveEntriesForWord(
  idx: OrthographyIndex,
  word: string
): ExpandedEntry[] {
  const norm = normalizeDiacriticOrder(word);
  const exact = idx.byExactWord.get(norm);
  if (exact && exact.length > 0) return exact;
  const expanded = idx.byExpandedUsage.get(norm);
  if (expanded && expanded.length > 0) return expanded;
  const stem = stripClassifierSuffix(norm);
  if (stem) {
    const byStemExact = idx.byExactWord.get(stem);
    if (byStemExact && byStemExact.length > 0) return byStemExact;
    const byStem = idx.byClassifierStem.get(stem);
    if (byStem && byStem.length > 0) return byStem;
  }
  return [];
}

function isVerifiedVerbStem(idx: OrthographyIndex, middleSyls: string[]): boolean {
  if (middleSyls.length === 0) return false;
  const trimmed = [...middleSyls];
  while (
    trimmed.length > 1 &&
    VERB_MODAL_SUFFIX_SYLLABLES.has(trimmed[trimmed.length - 1])
  ) {
    trimmed.pop();
  }
  const core = normalizeDiacriticOrder(trimmed.join(""));
  if (COMMON_UNAMBIGUOUS_VERBS.has(core)) return true;
  const exact = idx.byExactWord.get(core);
  if (exact && exact.some((e) => Boolean(e.v))) return true;
  // Also handle compound verb where the final syllable is an attested verb (e.g. စဉ်းစား, ပြောဆို, လိုက်နာ)
  if (trimmed.length === 2) {
    const lastSyl = normalizeDiacriticOrder(trimmed[1]);
    if (COMMON_UNAMBIGUOUS_VERBS.has(lastSyl)) return true;
    const lastExact = idx.byExactWord.get(lastSyl);
    if (lastExact && lastExact.some((e) => Boolean(e.v))) return true;
  }
  return false;
}

interface ContextParticleHit {
  corrected: string;
  rootLookupWord: string;
  reason: string;
  bookPage?: number;
}

/**
 * High-precision context-sensitive Burmese particle orthography validator:
 * 1) မ + [Verb] + ပဲ  ->  မ + [Verb] + ဘဲ   (e.g. မသွားပဲ -> မသွားဘဲ)
 * 2) မ + [Verb] + ဖူး ->  မ + [Verb] + ဘူး  (clause-final negation only, preserving မသွားဖူးဘူး / မမြင်ဖူးသေး)
 * 3) တစ် + [Classifier] + ထဲ -> တစ် + [Classifier] + တည်း (preserving locatives like တစ်ခန်းထဲမှာ)
 * 4) [Interrogative] + လည်း -> [Interrogative] + လဲ (e.g. ဘာလည်း -> ဘာလဲ, ဘယ်သူလည်း -> ဘယ်သူလဲ)
 */
function checkContextParticleRule(
  idx: OrthographyIndex,
  spanSyls: string[],
  followingSyls: string[]
): ContextParticleHit | null {
  if (spanSyls.length < 2) return null;

  const first = normalizeDiacriticOrder(spanSyls[0]);
  const last = normalizeDiacriticOrder(spanSyls[spanSyls.length - 1]);
  const nextFirst = followingSyls[0]
    ? normalizeDiacriticOrder(followingSyls[0])
    : "";

  // Rule 1: မ + [Verb] + ပဲ -> မ + [Verb] + ဘဲ
  if (spanSyls.length >= 3 && first === "မ" && last === "ပဲ") {
    const withoutPae = normalizeDiacriticOrder(spanSyls.slice(0, -1).join(""));
    const nounCandidate = idx.byExactWord.get(withoutPae);
    const isAttestedNoun =
      NON_NEGATED_MA_WORDS.has(withoutPae) ||
      Boolean(nounCandidate && nounCandidate.every((e) => !e.v));

    const middle = spanSyls.slice(1, -1);
    if (!isAttestedNoun && isVerifiedVerbStem(idx, middle)) {
      const verbStr = normalizeDiacriticOrder(middle.join(""));
      const baeEntry = idx.byExactWord.get("ဘဲ")?.[0];
      return {
        corrected: `မ${middle.join("")}ဘဲ`,
        rootLookupWord: idx.byExactWord.has(verbStr) ? verbStr : "ဘဲ",
        reason:
          "ငြင်းပယ်ကြိယာ “မ...” နောက်တွင် “ပဲ” မဟုတ်ဘဲ ဘကုန်း “ဘဲ” (မ...ဘဲ) ဖြင့် ရေးရသည်။",
        bookPage: baeEntry?.p,
      };
    }
  }

  // Rule 2: မ + [Verb] + ဖူး -> မ + [Verb] + ဘူး (ONLY when clause-final and NOT experiential ဖူး!)
  if (
    spanSyls.length >= 3 &&
    first === "မ" &&
    last === "ဖူး" &&
    followingSyls.length === 0
  ) {
    const prevSyl = normalizeDiacriticOrder(spanSyls[spanSyls.length - 2]);
    const withoutPhu = normalizeDiacriticOrder(spanSyls.slice(0, -1).join(""));
    const middle = spanSyls.slice(1, -1);
    if (
      prevSyl !== "စ" &&
      !EXPERIENTIAL_PHU_FOLLOWERS.has(nextFirst) &&
      !NON_NEGATED_MA_WORDS.has(withoutPhu) &&
      isVerifiedVerbStem(idx, middle)
    ) {
      const verbStr = normalizeDiacriticOrder(middle.join(""));
      const buEntry = idx.byExactWord.get("ဘူး")?.[0];
      return {
        corrected: `မ${middle.join("")}ဘူး`,
        rootLookupWord: idx.byExactWord.has(verbStr) ? verbStr : "ဘူး",
        reason:
          "ငြင်းပယ်ဝါကျအဆုံးတွင် “ဖူး” မဟုတ်ဘဲ ဘကုန်း “ဘူး” (မ...ဘူး) ဖြင့် ရေးရသည်။",
        bookPage: buEntry?.p,
      };
    }
  }

  // Rule 3: တစ် + [Classifier] + ထဲ -> တစ် + [Classifier] + တည်း
  if (spanSyls.length >= 3 && first === "တစ်" && last === "ထဲ") {
    const classifier = normalizeDiacriticOrder(spanSyls.slice(1, -1).join(""));
    const isStrict = STRICT_TADEE_CLASSIFIERS.has(classifier);
    const isNonLocative =
      NON_LOCATIVE_TADEE_CLASSIFIERS.has(classifier) &&
      !LOCATIVE_FOLLOWERS.has(nextFirst);

    if (isStrict || isNonLocative) {
      const corrected = `တစ်${spanSyls.slice(1, -1).join("")}တည်း`;
      const hitEntry =
        idx.byExactWord.get(corrected)?.[0] ??
        idx.byExactWord.get("တည်း")?.[0];
      return {
        corrected,
        rootLookupWord: idx.byExactWord.has(corrected) ? corrected : "တည်း",
        reason:
          "တစ်ခုတည်း・တစ်ဦးတည်း အနက်ပြ ပစ္စည်းဖြစ်၍ “ထဲ” မဟုတ်ဘဲ “တည်း” ဖြင့် ရေးရသည်။",
        bookPage: hitEntry?.p,
      };
    }
  }

  // Rule 4: [Interrogative] + လည်း -> [Interrogative] + လဲ (when not followed by negated verb မ...)
  if (last === "လည်း" && nextFirst !== "မ") {
    const stem = normalizeDiacriticOrder(spanSyls.slice(0, -1).join(""));
    if (INTERROGATIVE_LAE_STEMS.has(stem)) {
      const laeEntry = idx.byExactWord.get("လဲ")?.[0];
      return {
        corrected: `${spanSyls.slice(0, -1).join("")}လဲ`,
        rootLookupWord: idx.byExactWord.has(stem) ? stem : "လဲ",
        reason:
          "အမေးဝါကျနောက်ဆက်ပစ္စည်းဖြစ်၍ “လည်း” မဟုတ်ဘဲ “လဲ” ဖြင့် ရေးရသည်။",
        bookPage: laeEntry?.p,
      };
    }
  }

  return null;
}

/**
 * Extracts only the genuinely relevant clause/items from a Khwe-Hta distinction pair.
 */
export function buildFocusedDistinction(
  d: DistinctionPair,
  targetWords: string[]
): FocusedDistinction | null {
  const targetSet = new Set(
    targetWords.filter(Boolean).map(normalizeDiacriticOrder)
  );
  if (targetSet.size === 0) return null;

  if (d.t === "misspelling") {
    return {
      id: d.id,
      c: d.c,
      t: d.t,
      p: d.p,
      leftExcerpt: d.l,
      rightExcerpt: d.r,
    };
  }

  const leftItems = parseKhweItems(d.l);
  const rightItems = parseKhweItems(d.r);

  if (d.t === "dual" || d.t === "xref") {
    const leftHit = leftItems.filter((it) =>
      it.tokens.some((t) => targetSet.has(normalizeDiacriticOrder(t)))
    );
    const rightHit = rightItems.filter((it) =>
      it.tokens.some((t) => targetSet.has(normalizeDiacriticOrder(t)))
    );
    if (leftHit.length === 0 && rightHit.length === 0) return null;
    return {
      id: d.id,
      c: d.c,
      t: d.t,
      p: d.p,
      leftExcerpt:
        leftHit.length > 0 ? leftHit.map((i) => i.rawItem).join("၊ ") : d.l,
      rightExcerpt:
        rightHit.length > 0 ? rightHit.map((i) => i.rawItem).join("၊ ") : d.r,
    };
  }

  const targetLooseKeys = new Set(
    Array.from(targetSet).map((w) => toLoosePhoneticKey(w))
  );
  const targetOpenKeys = new Set(
    Array.from(targetSet).map((w) => toOpenVowelSkeleton(w))
  );

  const matchesTargetExact = (it: ParsedKhweItem) =>
    it.tokens.some((t) => targetSet.has(normalizeDiacriticOrder(t)));
  const matchesTargetSound = (it: ParsedKhweItem) =>
    it.tokens.some(
      (t) =>
        targetLooseKeys.has(toLoosePhoneticKey(t)) ||
        targetOpenKeys.has(toOpenVowelSkeleton(t))
    );

  const leftExact = leftItems.filter(matchesTargetExact);
  const rightExact = rightItems.filter(matchesTargetExact);

  if (leftExact.length > 0) {
    const rightConfusable = rightItems.filter(matchesTargetSound);
    if (rightConfusable.length === 0) return null;
    return {
      id: d.id,
      c: d.c,
      t: d.t,
      p: d.p,
      leftExcerpt: leftExact
        .slice(0, 3)
        .map((i) => i.rawItem)
        .join("၊ "),
      rightExcerpt: rightConfusable
        .slice(0, 3)
        .map((i) => i.rawItem)
        .join("၊ "),
    };
  }

  if (rightExact.length > 0) {
    const leftConfusable = leftItems.filter(matchesTargetSound);
    if (leftConfusable.length === 0) return null;
    return {
      id: d.id,
      c: d.c,
      t: d.t,
      p: d.p,
      leftExcerpt: leftConfusable
        .slice(0, 3)
        .map((i) => i.rawItem)
        .join("၊ "),
      rightExcerpt: rightExact
        .slice(0, 3)
        .map((i) => i.rawItem)
        .join("၊ "),
    };
  }

  return null;
}

function collectHomophoneAlternatives(
  idx: OrthographyIndex,
  primaryWord: string | undefined,
  excludedWords: Set<string>
): ExpandedEntry[] {
  if (!primaryWord) return [];
  const normWord = normalizeDiacriticOrder(primaryWord);
  const strictKey = toStrictPhoneticKey(normWord);
  if (!strictKey) return [];

  const seen = new Set<string>(excludedWords);
  seen.add(primaryWord);
  seen.add(normWord);

  const out: ExpandedEntry[] = [];
  const pushEntry = (e: ExpandedEntry) => {
    if (out.length >= 6 || seen.has(e.w)) return;
    seen.add(e.w);
    out.push(e);
  };

  for (const e of idx.byStrictPhonetic.get(strictKey) ?? []) {
    pushEntry(e);
  }

  // Also include classic Burmese -ည် / -ဉ် / -ီ / -င် rhyme-pair confusables for direct headword lookup
  const rhymeSwapPairs: Array<[RegExp, string[]]> = [
    [/ည်း$/, ["ဉ်း", "င်း", "ီး"]],
    [/ဉ်း$/, ["ည်း", "င်း", "ီး"]],
    [/ည်$/, ["ဉ်", "ီ", "င်"]],
    [/ဉ်$/, ["ည်", "င်", "ီ"]],
    [/ီ$/, ["ည်", "ဉ်"]],
  ];
  for (const [pat, replacements] of rhymeSwapPairs) {
    if (pat.test(normWord)) {
      for (const rep of replacements) {
        const swapped = normalizeDiacriticOrder(normWord.replace(pat, rep));
        const swappedStrict = toStrictPhoneticKey(swapped);
        for (const e of idx.byExactWord.get(swapped) ?? []) {
          pushEntry(e);
        }
        for (const e of idx.byStrictPhonetic.get(swappedStrict) ?? []) {
          if (splitMyanmarSyllables(e.w).length === splitMyanmarSyllables(normWord).length) {
            pushEntry(e);
          }
        }
      }
      break;
    }
  }

  return out;
}

export function searchOrthography(
  rawQuery: string,
  limit = 40
): SmartSearchOutcome {
  const idx = getOrthographyIndex();
  const { normalized, wasZawgyi } = normalizeMyanmarInput(rawQuery);
  const q = normalizeDiacriticOrder(
    normalized
      .replace(/[-~၊။“”?]/g, "")
      .replace(/\s+/g, "")
      .trim()
  );

  if (!q) {
    return {
      rawQuery,
      normalizedQuery: "",
      wasZawgyi,
      hasExactMatch: false,
      results: [],
      homophoneAlternatives: [],
      relatedDistinctions: [],
    };
  }

  const resultMap = new Map<number, SearchResultItem>();
  const addCandidate = (
    entry: ExpandedEntry,
    matchKind: MatchKind,
    score: number,
    reasonLabel: string,
    diff?: SyllableDiffPart[],
    relatedDistinction?: DistinctionPair
  ) => {
    const existing = resultMap.get(entry.id);
    if (!existing || score > existing.score) {
      resultMap.set(entry.id, {
        entry,
        matchKind,
        score,
        reasonLabel,
        diff: diff ?? existing?.diff,
        relatedDistinction: relatedDistinction ?? existing?.relatedDistinction,
      });
    }
  };

  // TIER 1: Exact Headword / Expanded Note / Verified Khwe Match
  const exactHits = idx.byExactWord.get(q) ?? [];
  const expandedHits = idx.byExpandedUsage.get(q) ?? [];

  let hasExactMatch = false;
  let resolvedInflection: SmartSearchOutcome["resolvedInflection"] | undefined;

  if (exactHits.length > 0) {
    hasExactMatch = true;
    for (const e of exactHits) {
      addCandidate(e, "exact", 1000, "သတ်ပုံအမှန် (တိုက်ရိုက်တွေ့ရှိ)");
    }
  } else if (expandedHits.length > 0) {
    hasExactMatch = true;
    for (const e of expandedHits) {
      addCandidate(e, "expanded_usage", 980, "တွဲဖက်အသုံးအနှုန်း သတ်ပုံအမှန်");
    }
  } else if (idx.verifiedKhweCorrectWords.has(q) && !idx.misspellingMap.has(q)) {
    hasExactMatch = true;
    const stemEntries = resolveEntriesForWord(idx, q);
    for (const e of stemEntries) {
      addCandidate(
        e,
        "exact",
        975,
        `သတ်ပုံအမှန် (ပင်မတည်ပုဒ် — ${e.displayHeadword})`
      );
    }
  }

  let primaryCorrection: SmartSearchOutcome["primaryCorrection"] | undefined;
  const qSyllables = splitMyanmarSyllables(q);

  if (!hasExactMatch) {
    // 2A-0. Context-sensitive Burmese particle orthography rule (e.g. မသွားပဲ -> မသွားဘဲ, တစ်ယောက်ထဲ -> တစ်ယောက်တည်း, ဘာလည်း -> ဘာလဲ)
    const particleHit = checkContextParticleRule(idx, qSyllables, []);
    if (particleHit) {
      const rootEntries = resolveEntriesForWord(idx, particleHit.rootLookupWord);
      for (const e of rootEntries) {
        addCandidate(e, "particle_rule", 996, "သတ်ပုံကျမ်း ရေးထုံးစည်းမျဉ်း");
      }
      primaryCorrection = {
        wrongText: q,
        correctWords: [particleHit.corrected],
        sourceType: "particle_rule",
        explanation: particleHit.reason,
        primaryEntry: rootEntries[0],
        diff: computeSpellingDiff(q, particleHit.corrected),
      };
    }

    // 2A. Classic Orthographic Error Table (e.g. ညဏ် -> ဉာဏ်, အဓိပ္ပါယ် -> အဓိပ္ပာယ်, ပြသနာ -> ပြဿနာ)
    const classic = !primaryCorrection ? CLASSIC_MISSPELLINGS[q] : undefined;
    if (classic) {
      const resolved = resolveEntriesForWord(idx, classic.correct);
      for (const e of resolved) {
        addCandidate(
          e,
          "khwe_correction",
          995,
          "သတ်ပုံကျမ်း ရေးထုံးအမှန်",
          computeSpellingDiff(q, e.w)
        );
      }
      primaryCorrection = {
        wrongText: q,
        correctWords: [classic.correct],
        sourceType: "phonetic_auto",
        explanation: classic.reason,
        primaryEntry: resolved[0],
        diff: computeSpellingDiff(q, classic.correct),
      };
    }

    // 2B. Official Khwe-Hta Explicit Misspellings (မှား × → မှန်)
    let khweCorrection = !primaryCorrection ? idx.misspellingMap.get(q) : undefined;
    if (!primaryCorrection && !khweCorrection && qSyllables.length >= 2) {
      for (const [wrongTok, info] of idx.misspellingMap.entries()) {
        if (wrongTok.startsWith(q)) {
          khweCorrection = info;
          break;
        }
      }
    }

    if (khweCorrection) {
      const { pair, correctWords } = khweCorrection;
      let firstEntry: ExpandedEntry | undefined;
      for (const cw of correctWords) {
        const resolved = resolveEntriesForWord(idx, cw);
        for (const e of resolved) {
          if (!firstEntry) firstEntry = e;
          addCandidate(
            e,
            "khwe_correction",
            990,
            `ခွဲထားအညွှန်း အမှန်ပြပုဒ် (စာမျက်နှာ ${pair.p})`,
            computeSpellingDiff(q, e.w),
            pair
          );
        }
      }
      primaryCorrection = {
        wrongText: q,
        correctWords,
        sourceType: "khwe_misspelling",
        explanation: `သတ်ပုံကျမ်း ခွဲထားအပိုင်း (စာမျက်နှာ ${pair.p}) တွင် ရေးထုံးအမှားအဖြစ် သတိပေးထားပြီး အမှန်ကို တိုက်ရိုက်ညွှန်ပြထားပါသည်။`,
        distinction: pair,
        primaryEntry: firstEntry,
        diff: correctWords[0]
          ? computeSpellingDiff(q, correctWords[0])
          : undefined,
      };
    }

    // 2C. Explicit တစ် vs တ Rule Confusions (only when first syllable is bare တ or တစ်)
    if (resultMap.size === 0 && !primaryCorrection && qSyllables.length >= 2) {
      const altTatQueries: { candidate: string; ruleNote: string }[] = [];
      if (qSyllables[0] === "တစ်") {
        altTatQueries.push({
          candidate: "တ" + qSyllables.slice(1).join(""),
          ruleNote:
            "အာဂုံပစ္စည်း “တ” ဖြစ်၍ စမသတ်ဘဲ ရေးရသည် (အမှာစာ မူ-ခ/ဂ)",
        });
      } else if (qSyllables[0] === "တ") {
        altTatQueries.push({
          candidate: "တစ်" + qSyllables.slice(1).join(""),
          ruleNote:
            "ကိန်းဂဏန်း ၁ အနက်ရှိ၍ စသတ် “တစ်” ဖြင့် ရေးရသည် (အမှာစာ မူ-က)",
        });
      }
      for (const alt of altTatQueries) {
        const hits = resolveEntriesForWord(idx, alt.candidate);
        for (const e of hits) {
          const diff = computeSpellingDiff(q, e.w);
          addCandidate(e, "tat_ta_rule", 975, alt.ruleNote, diff);
          if (!primaryCorrection) {
            primaryCorrection = {
              wrongText: q,
              correctWords: [e.w],
              sourceType: "tat_ta",
              explanation: alt.ruleNote,
              primaryEntry: e,
              diff,
            };
          }
        }
      }
    }

    // 2C-2. Inflected / Suffixed Word Recovery (e.g. စဉ်းစားသည် -> စဉ်းစား-, ပတ်ဝန်းကျင်မှာ -> ပတ်ဝန်းကျင်, ပက်ဝန်းကျင်မှာ -> ပတ်ဝန်းကျင်မှာ)
    if (resultMap.size === 0 && !primaryCorrection && qSyllables.length >= 2) {
      for (const suf of TRAILING_GRAMMAR_SUFFIXES) {
        if (q.length > suf.length + 1 && q.endsWith(suf)) {
          const stem = q.slice(0, -suf.length);
          const stemSyls = splitMyanmarSyllables(stem);
          // Ensure suffix boundary aligns cleanly with syllable boundaries
          if (stemSyls.join("") + suf !== q) continue;

          const exactStemEntries =
            idx.byExactWord.get(stem) ?? idx.byExpandedUsage.get(stem) ?? [];
          if (exactStemEntries.length > 0) {
            hasExactMatch = true;
            resolvedInflection = {
              queriedForm: q,
              baseHeadword: exactStemEntries[0].displayHeadword,
              suffix: suf,
            };
            for (const e of exactStemEntries) {
              addCandidate(
                e,
                "inflected_exact",
                972,
                `ပင်မတည်ပုဒ် သတ်ပုံအမှန် (နောက်ဆက် “${suf}” တွဲလျက်)`
              );
            }
            break;
          }

          // Check if the stem itself is a known misspelling or strict homophone of a headword!
          const stemErr = checkSyllableSpanError(idx, stemSyls, splitMyanmarSyllables(suf));
          if (stemErr && stemErr.suggestions.length > 0) {
            const correctedStem = stemErr.suggestions[0];
            const correctedFull = correctedStem + suf;
            const stemResolved = resolveEntriesForWord(idx, correctedStem);
            for (const e of stemResolved) {
              addCandidate(
                e,
                "khwe_correction",
                965,
                `ပင်မတည်ပုဒ် သတ်ပုံအမှန် (${e.displayHeadword})`,
                computeSpellingDiff(stem, e.w)
              );
            }
            primaryCorrection = {
              wrongText: q,
              correctWords: [correctedFull],
              sourceType:
                stemErr.status === "correction"
                  ? "khwe_misspelling"
                  : "phonetic_auto",
              explanation: stemErr.reason,
              primaryEntry: stemResolved[0],
              diff: computeSpellingDiff(q, correctedFull),
            };
            break;
          }
        }
      }
    }

    // 2D. Phonetic & Attested Prefix Resolution
    const qStrict = toStrictPhoneticKey(q);
    const qOpen = toOpenVowelSkeleton(q);
    const qLoose = toLoosePhoneticKey(q);

    if (resultMap.size === 0 && !idx.attestedValidSpans.has(q)) {
      const strictMatches = idx.byStrictPhonetic.get(qStrict) ?? [];
      const qPaliChars = Array.from(q).filter((ch) =>
        /[ဉဏဋဌဍဎဃဈဿဠ]/.test(ch)
      );
      for (const e of strictMatches) {
        const dist = editDistance(q, e.w, 6);
        const paliBonus = qPaliChars.some((ch) => e.w.includes(ch)) ? 25 : 0;
        addCandidate(
          e,
          "phonetic",
          920 + paliBonus - Math.min(dist * 10, 60),
          "အသံထွက်တူ သတ်ပုံအမှန်",
          computeSpellingDiff(q, e.w)
        );
      }
    }

    if (resultMap.size === 0 && !idx.attestedValidSpans.has(q)) {
      const openMatches = idx.byOpenSkeleton.get(qOpen) ?? [];
      for (const e of openMatches) {
        const dist = editDistance(q, e.w, 6);
        addCandidate(
          e,
          "phonetic",
          890 - Math.min(dist * 12, 70),
          "သရ・ဗျည်းတွဲ အသံတူ သတ်ပုံအမှန်",
          computeSpellingDiff(q, e.w)
        );
      }
    }

    if (resultMap.size === 0 && idx.attestedValidSpans.has(q)) {
      hasExactMatch = true;
      for (const e of idx.entries) {
        if (e.w.startsWith(q)) {
          const lenBonus = Math.max(0, 30 - (e.w.length - q.length) * 2);
          addCandidate(
            e,
            "prefix",
            880 + lenBonus,
            `“${q}” ပါဝင်သော သတ်ပုံအမှန် တည်ပုဒ်`
          );
        }
      }
    }

    if (resultMap.size === 0) {
      const looseMatches = idx.byLoosePhonetic.get(qLoose) ?? [];
      for (const e of looseMatches) {
        const dist = editDistance(q, e.w, 6);
        addCandidate(
          e,
          "phonetic",
          845 - Math.min(dist * 12, 70),
          "အသံနီးစပ်သော သတ်ပုံအမှန်",
          computeSpellingDiff(q, e.w)
        );
      }
    }

    // 2E. Prefix / Phonetic-Prefix Fallback
    if (resultMap.size === 0) {
      for (const e of idx.entries) {
        if (e.w.startsWith(q)) {
          const lenBonus = Math.max(0, 30 - (e.w.length - q.length) * 2);
          addCandidate(e, "prefix", 760 + lenBonus, "ရှေ့စာလုံးတူ တည်ပုဒ်");
        } else if (
          qStrict.length >= 3 &&
          e.strictPhonetic.startsWith(qStrict)
        ) {
          const lenPenalty = Math.min(
            40,
            (e.strictPhonetic.length - qStrict.length) * 4
          );
          addCandidate(
            e,
            "phonetic",
            790 - lenPenalty,
            "အသံတူ စကားတွဲ သတ်ပုံအမှန်",
            computeSpellingDiff(q, e.w)
          );
        }
      }
    }

    // 2F. Tight Edit-Distance Fuzzy Fallback ONLY when nothing matched above and query is not an attested span
    if (resultMap.size === 0 && !idx.attestedValidSpans.has(q) && qLoose.length >= 3) {
      const maxAllowed = 1;
      for (const e of idx.entries) {
        if (Math.abs(e.loosePhonetic.length - qLoose.length) > maxAllowed) {
          continue;
        }
        const pDist = editDistance(qLoose, e.loosePhonetic, maxAllowed);
        if (pDist <= maxAllowed) {
          const rawDist = editDistance(q, e.w, 3);
          if (rawDist <= 3) {
            addCandidate(
              e,
              "fuzzy",
              620 - pDist * 40 - rawDist * 10,
              "အနီးစပ်ဆုံး သတ်ပုံအမှန်",
              computeSpellingDiff(q, e.w)
            );
          }
        }
      }
    }
  }

  const effectiveLimit = hasExactMatch
    ? Math.max(
        exactHits.length,
        resultMap.size > 0 ? Math.min(resultMap.size, 6) : 4
      )
    : Math.min(limit, 8);

  const sortedResults = Array.from(resultMap.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.entry.w.length !== b.entry.w.length) {
        return a.entry.w.length - b.entry.w.length;
      }
      return a.entry.w.localeCompare(b.entry.w, "my");
    })
    .slice(0, effectiveLimit);

  if (!hasExactMatch && !primaryCorrection && sortedResults.length > 0) {
    const top = sortedResults[0];
    if (
      top.matchKind === "phonetic" ||
      top.matchKind === "khwe_correction" ||
      top.matchKind === "tat_ta_rule" ||
      (top.matchKind === "fuzzy" && top.score >= 560)
    ) {
      const topAlts = sortedResults
        .filter(
          (r) =>
            r.score >= top.score - 20 &&
            (r.matchKind === "phonetic" ||
              r.matchKind === "khwe_correction" ||
              r.matchKind === "tat_ta_rule")
        )
        .slice(0, 4)
        .map((r) => r.entry.w);

      const uniqueCorrect = Array.from(new Set([top.entry.w, ...topAlts]));

      primaryCorrection = {
        wrongText: q,
        correctWords: uniqueCorrect,
        sourceType: "phonetic_auto",
        explanation:
          uniqueCorrect.length > 1
            ? "ရှာဖွေထားသော စာလုံးပေါင်းအတိုင်း တိုက်ရိုက်မရှိသော်လည်း အသံထွက်တူ သတ်ပုံအမှန်များကို အနက်အလိုက် ရွေးချယ်နိုင်ရန် ဖော်ပြထားပါသည်။"
            : "ရှာဖွေထားသော စာလုံးပေါင်းအစား သတ်ပုံကျမ်းပါ အသံထွက်တူ ရေးထုံးအမှန်ကို အလိုအလျောက် ရှာဖွေဖော်ပြထားပါသည်။",
        primaryEntry: top.entry,
        diff: computeSpellingDiff(q, uniqueCorrect[0]),
      };
    }
  }

  const shownWords = new Set<string>(sortedResults.map((r) => r.entry.w));
  const anchorWord =
    sortedResults[0]?.entry.w ?? primaryCorrection?.correctWords[0];
  const homophoneAlternatives = collectHomophoneAlternatives(
    idx,
    anchorWord,
    shownWords
  );

  const targetLookupWords = Array.from(
    new Set([
      q,
      ...(primaryCorrection?.correctWords ?? []),
      ...sortedResults.slice(0, 2).map((r) => r.entry.w),
    ])
  );

  const rawDistMap = new Map<number, DistinctionPair>();
  for (const key of targetLookupWords) {
    const pairs = idx.distinctionByWord.get(key) ?? [];
    for (const p of pairs) {
      rawDistMap.set(p.id, p);
    }
  }

  const focusedDistinctions: FocusedDistinction[] = [];
  for (const d of rawDistMap.values()) {
    const focused = buildFocusedDistinction(d, targetLookupWords);
    if (focused) {
      focusedDistinctions.push(focused);
    }
  }

  return {
    rawQuery,
    normalizedQuery: q,
    wasZawgyi,
    hasExactMatch,
    resolvedInflection,
    primaryCorrection,
    results: sortedResults,
    homophoneAlternatives,
    relatedDistinctions: focusedDistinctions.slice(0, 4),
  };
}

interface SpanCorrectionHit {
  suggestions: string[];
  status: "correction" | "suggestion";
  reason: string;
  bookPage?: number;
}

/**
 * High-precision span validator used by the Paragraph Orthography Checker.
 * NEVER guesses wild loose-phonetic or tone-stripping substitutions on valid Burmese prose.
 * Flags:
 *  0) High-confidence context-sensitive Burmese particle rules (`မ...ဘဲ`, `...တည်း`, `အမေးပုဒ်...လဲ`, `မ...ဘူး`)
 *  1) Explicit Khwe-Hta misspellings (`မှား × → မှန်`) & classic orthographic errors (`ညဏ်`, `အဓိပ္ပါယ်`, `ပြသနာ`, `ပတ်သတ်`)
 *  2) Explicit `တစ်` vs `တ` rule violations against verified headwords
 *  3) Multi-syllable (`>= 2` syllables) unattested spans that are exact tone-preserving homophones of an attested headword
 */
function checkSyllableSpanError(
  idx: OrthographyIndex,
  spanSyls: string[],
  followingSyls: string[] = []
): SpanCorrectionHit | null {
  const span = normalizeDiacriticOrder(spanSyls.join(""));
  if (!span) return null;

  // 0. Context-sensitive Burmese particle orthography rules
  const particleHit = checkContextParticleRule(idx, spanSyls, followingSyls);
  if (particleHit) {
    return {
      suggestions: [particleHit.corrected],
      status: "correction",
      reason: particleHit.reason,
      bookPage: particleHit.bookPage,
    };
  }

  // 1. Classic orthographic error
  const classic = CLASSIC_MISSPELLINGS[span];
  if (classic) {
    const hit = resolveEntriesForWord(idx, classic.correct)[0];
    return {
      suggestions: [classic.correct],
      status: "correction",
      reason: classic.reason,
      bookPage: hit?.p,
    };
  }

  // 2. Official Khwe-Hta explicit misspelling
  const khwe = idx.misspellingMap.get(span);
  if (khwe) {
    return {
      suggestions: khwe.correctWords,
      status: "correction",
      reason: `သတ်ပုံကျမ်း ခွဲထားအပိုင်း (စာမျက်နှာ ${khwe.pair.p}) ပါ ရေးထုံးအမှား ဖြစ်ပါသည်။`,
      bookPage: khwe.pair.p,
    };
  }

  // If already an attested valid word or prefix in the Spelling Book / standard Burmese, NEVER flag!
  if (idx.attestedValidSpans.has(span)) {
    return null;
  }

  // 3. Explicit တစ် vs တ rule on multi-syllable words where syllable 0 is bare "တ" or "တစ်"
  if (spanSyls.length >= 2) {
    if (spanSyls[0] === "တစ်") {
      const alt = "တ" + spanSyls.slice(1).join("");
      const hits = idx.byExactWord.get(alt);
      if (hits && hits.length > 0) {
        return {
          suggestions: [hits[0].w],
          status: "correction",
          reason:
            "အာဂုံပစ္စည်း “တ” ဖြစ်၍ စမသတ်ဘဲ ရေးရသည် (အမှာစာ မူ-ခ/ဂ)",
          bookPage: hits[0].p,
        };
      }
    } else if (spanSyls[0] === "တ") {
      const alt = "တစ်" + spanSyls.slice(1).join("");
      const hits = idx.byExactWord.get(alt);
      if (hits && hits.length > 0) {
        return {
          suggestions: [hits[0].w],
          status: "correction",
          reason:
            "ကိန်းဂဏန်း ၁ အနက်ရှိ၍ စသတ် “တစ်” ဖြင့် ရေးရသည် (အမှာစာ မူ-က)",
          bookPage: hits[0].p,
        };
      }
    }
  }

  // 4. Multi-syllable (>= 2 syllables) exact tone-preserving homophone of an official headword
  if (spanSyls.length >= 2) {
    const strictKey = toStrictPhoneticKey(span);
    const openKey = toOpenVowelSkeleton(span);

    const candidates = [
      ...(idx.byStrictPhonetic.get(strictKey) ?? []),
      ...(idx.byOpenSkeleton.get(openKey) ?? []),
    ].filter(
      (e) =>
        e.w !== span &&
        e.syllableCount === spanSyls.length &&
        editDistance(span, e.w, 3) <= 2
    );

    if (candidates.length > 0) {
      const uniqueWords = Array.from(new Set(candidates.map((c) => c.w))).slice(
        0,
        3
      );
      return {
        suggestions: uniqueWords,
        status: "suggestion",
        reason:
          "သတ်ပုံကျမ်းပါ အသံထွက်တူ ရေးထုံးအမှန်ဖြင့် တိုက်ဆိုင်အကြံပြုထားပါသည်။",
        bookPage: candidates[0].p,
      };
    }
  }

  return null;
}

/**
 * Multi-word / natural Burmese paragraph orthography checker:
 * - Passes English/Latin words, numbers, whitespace, and punctuation through untouched.
 * - Scans inside unspaced Burmese clauses using syllable-boundary sliding windows (longest match 6..1 syllables)
 *   so valid multi-word phrases have ZERO false positives, while genuine lexical and context-particle misspellings
 *   are pinpointed cleanly!
 */
export function checkPhraseOrthography(rawText: string): PhraseCheckToken[] {
  const { normalized } = normalizeMyanmarInput(rawText);
  if (!normalized) return [];

  const idx = getOrthographyIndex();
  const segments = normalized
    .split(/([\u1000-\u103F\u104C-\u104F]+)/)
    .filter((s) => s.length > 0);

  const tokens: PhraseCheckToken[] = [];

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    if (!/[\u1000-\u103F\u104C-\u104F]/.test(seg)) {
      tokens.push({
        raw: seg,
        cleanWord: seg,
        status: "punctuation",
        suggestions: [],
      });
      continue;
    }

    // Peek across single space (not sentence-ending ၊ or ။) to next Myanmar segment for context guards (e.g. "ဘာလည်း မသိဘူး" or "တစ်ခုထဲ မှာ")
    let nextSegFirstSyls: string[] = [];
    if (
      segIdx + 2 < segments.length &&
      /^\s+$/.test(segments[segIdx + 1]) &&
      /[\u1000-\u103F\u104C-\u104F]/.test(segments[segIdx + 2])
    ) {
      nextSegFirstSyls = splitMyanmarSyllables(segments[segIdx + 2]).slice(0, 2);
    }

    const syls = splitMyanmarSyllables(seg);
    let i = 0;
    let validBuffer = "";

    const flushValidBuffer = () => {
      if (validBuffer) {
        tokens.push({
          raw: validBuffer,
          cleanWord: validBuffer,
          status: "exact",
          suggestions: [],
        });
        validBuffer = "";
      }
    };

    while (i < syls.length) {
      let matchedError: { spanLen: number; hit: SpanCorrectionHit } | null =
        null;

      const maxWindow = Math.min(6, syls.length - i);
      for (let len = maxWindow; len >= 1; len--) {
        const subSyls = syls.slice(i, i + len);
        const subStr = normalizeDiacriticOrder(subSyls.join(""));
        const followingSyls =
          i + len < syls.length
            ? syls.slice(i + len)
            : nextSegFirstSyls;

        // Check context particle rules FIRST before consuming multi-syllable attested words
        const particleErr = checkContextParticleRule(idx, subSyls, followingSyls);
        if (particleErr) {
          matchedError = {
            spanLen: len,
            hit: {
              suggestions: [particleErr.corrected],
              status: "correction",
              reason: particleErr.reason,
              bookPage: particleErr.bookPage,
            },
          };
          break;
        }

        // If this multi-syllable span is itself a known valid word/headword (and not a misspelling), consume it as valid!
        if (
          len >= 2 &&
          (idx.byExactWord.has(subStr) ||
            idx.byExpandedUsage.has(subStr) ||
            idx.verifiedKhweCorrectWords.has(subStr) ||
            STANDARD_UNAMBIGUOUS_WORDS.includes(subStr)) &&
          !idx.misspellingMap.has(subStr) &&
          !CLASSIC_MISSPELLINGS[subStr]
        ) {
          // Before consuming e.g. "တစ်ယောက်" in "တစ်ယောက်ထဲ", make sure a longer particle rule didn't already match (checked above as len goes 6..1!)
          validBuffer += subSyls.join("");
          i += len;
          matchedError = {
            spanLen: 0,
            hit: null as unknown as SpanCorrectionHit,
          };
          break;
        }

        const err = checkSyllableSpanError(idx, subSyls, followingSyls);
        if (err) {
          matchedError = { spanLen: len, hit: err };
          break;
        }
      }

      if (matchedError) {
        if (matchedError.spanLen > 0) {
          flushValidBuffer();
          const rawSub = syls.slice(i, i + matchedError.spanLen).join("");
          tokens.push({
            raw: rawSub,
            cleanWord: rawSub,
            status: matchedError.hit.status,
            suggestions: matchedError.hit.suggestions,
            reason: matchedError.hit.reason,
            bookPage: matchedError.hit.bookPage,
          });
          i += matchedError.spanLen;
        }
      } else {
        validBuffer += syls[i];
        i++;
      }
    }

    flushValidBuffer();
  }

  return tokens;
}
