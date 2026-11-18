/**
 * Deterministic Zawgyi-One detection and single-pass conversion to standard Myanmar Unicode.
 * Only triggers on sequences that are strictly illegal in Myanmar Unicode 5.1+.
 */

// Strictly illegal in Unicode:
// 1. Zawgyi-only codepoints U+1033, U+1034, U+105A..U+1097
// 2. Pre-base visual \u1031 at start of string or after space/punctuation/tone/asat (in Unicode \u1031 ALWAYS follows a consonant or medial)
// 3. Virama \u1039 at end of string or before space/punctuation/vowels/tones (in Unicode \u1039 ALWAYS precedes a subscript consonant, whereas in Zawgyi \u1039 IS asat '်'!)
const ZAWGYI_STRICT_RE =
  /[\u1033\u1034\u105A-\u1097]|(?:^|[\s၊။()“”"\u1037\u1038\u103A])\u1031|\u1039(?:$|[\s၊။()“”"\u102B-\u1038])/;

const ZG_SINGLE_PASS_MAP: Record<string, string> = {
  "\u1031": "\uFFF0", // visual E
  "\u1033": "ု",
  "\u1034": "ူ",
  "\u1039": "်", // Zawgyi asat -> Unicode \u103A
  "\u103A": "ျ", // Zawgyi ya-pin -> Unicode \u103B
  "\u103B": "\uFFF1", // Zawgyi ya-yit -> visual Ra
  "\u103C": "ွ", // Zawgyi wa-hswe -> Unicode \u103D
  "\u103D": "ှ", // Zawgyi ha-hto -> Unicode \u103E
  "\u103E": "ှွ",
  "\u105A": "ါ်",
  "\u1060": "္က",
  "\u1061": "္ခ",
  "\u1062": "္ဂ",
  "\u1063": "္ဃ",
  "\u1064": "\uFFF2", // kinzi
  "\u1065": "္စ",
  "\u1066": "္ဆ",
  "\u1067": "္ဆ",
  "\u1068": "္ဇ",
  "\u1069": "္ဈ",
  "\u106A": "ဉ",
  "\u106B": "ည",
  "\u106C": "္ဋ",
  "\u106D": "္ဌ",
  "\u106E": "ဍ္ဍ",
  "\u106F": "ဍ္ဎ",
  "\u1070": "္ဏ",
  "\u1071": "္တ",
  "\u1072": "္တ",
  "\u1073": "္ထ",
  "\u1074": "္ထ",
  "\u1075": "္ဒ",
  "\u1076": "္ဓ",
  "\u1077": "္န",
  "\u1078": "္ပ",
  "\u1079": "္ဖ",
  "\u107A": "္ဗ",
  "\u107B": "္ဘ",
  "\u107C": "္မ",
  "\u107D": "ျ",
  "\u107E": "\uFFF1",
  "\u107F": "\uFFF1",
  "\u1080": "\uFFF1",
  "\u1081": "\uFFF1",
  "\u1082": "\uFFF1",
  "\u1083": "\uFFF1",
  "\u1084": "\uFFF1",
  "\u1085": "္လ",
  "\u1086": "ဿ",
  "\u1087": "ှ",
  "\u1088": "ှု",
  "\u1089": "ှူ",
  "\u108A": "ွှ",
  "\u108B": "\uFFF2ိ",
  "\u108C": "\uFFF2ီ",
  "\u108D": "\uFFF2ံ",
  "\u108E": "ိံ",
  "\u108F": "န",
  "\u1090": "ရ",
  "\u1091": "ဏ္ဍ",
  "\u1092": "ဋ္ဌ",
  "\u1094": "့",
  "\u1095": "့",
  "\u1097": "ဏ္ဌ",
};

const ZG_SINGLE_PASS_RE = new RegExp(
  `[${Object.keys(ZG_SINGLE_PASS_MAP).join("")}]`,
  "g"
);

export function isLikelyZawgyi(input: string): boolean {
  if (!input) return false;
  return ZAWGYI_STRICT_RE.test(input);
}

export function normalizeMyanmarInput(raw: string): {
  normalized: string;
  wasZawgyi: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { normalized: "", wasZawgyi: false };

  const wasZg = isLikelyZawgyi(trimmed);
  let s = trimmed;

  if (wasZg) {
    s = s.replace(ZG_SINGLE_PASS_RE, (ch) => ZG_SINGLE_PASS_MAP[ch] ?? ch);

    const clusterPat = /([\uFFF0\uFFF1]+)([က-အဥဦဣဤဧ](?:္[က-အ])?)/g;
    for (let i = 0; i < 3; i++) {
      s = s.replace(clusterPat, (_m, pre: string, base: string) => {
        const ra = pre.includes("\uFFF1") ? "ြ" : "";
        const e = pre.includes("\uFFF0") ? "ေ" : "";
        return `${base}${ra}${e}`;
      });
    }
    s = s.replace(/\uFFF0/g, "ေ").replace(/\uFFF1/g, "ြ");

    s = s.replace(/([က-အ](?:္[က-အ])?)([ျြွှေိီုူဲံ]*)\uFFF2/g, "င်္$1$2");
    s = s.replace(/\uFFF2/g, "င်္");
  }

  // Canonicalize Unicode diacritic typing order
  s = s
    .replace(/ဥ(?=[်ာ္])/g, "ဉ")
    .replace(/သြော်/g, "ဪ")
    .replace(/သြ(?![ာါိီုူဲံ့်းျွှ])/g, "ဩ")
    .replace(/([ျြွှေိီုူဲါာံ့်း]{2,})/g, (d) => {
      const order = ["ျ", "ြ", "ွ", "ှ", "ေ", "ိ", "ီ", "ု", "ူ", "ဲ", "ါ", "ာ", "ံ", "့", "်", "း"];
      let res = "";
      for (const ch of order) {
        if (d.includes(ch)) res += ch;
      }
      return res;
    });

  return { normalized: s, wasZawgyi: wasZg };
}
