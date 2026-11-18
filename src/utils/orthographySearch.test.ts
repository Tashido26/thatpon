import test from "node:test";
import assert from "node:assert/strict";
import {
  checkPhraseOrthography,
  computeSpellingDiff,
  expandTildeNote,
  searchOrthography,
  splitMyanmarSyllables,
} from "./orthographySearch";
import { parseMyWiktionaryExtract } from "./dictionaryMeaning";
import { normalizeMyanmarInput } from "./zawgyiNormalize";
import { orthographyDataset } from "../data/orthographyLoader";

test("dataset contains complete official entries, khwe-hta distinctions, and rhymes", () => {
  assert.ok(orthographyDataset.entries.length > 12000);
  assert.ok(orthographyDataset.distinctions.length > 800);
  assert.ok(orthographyDataset.rhymes.length > 1800);
  assert.equal(orthographyDataset.entries[0].w, "ကကုသန်ဘုရား");
});

test("splitMyanmarSyllables is 100% lossless across all 12,113 entries including Great Sa ဿ", () => {
  for (const e of orthographyDataset.entries) {
    assert.equal(
      splitMyanmarSyllables(e.w).join(""),
      e.w.trim(),
      `Syllable join mismatch on ${e.w}`
    );
  }

  const wethandaya = searchOrthography("ဝေသန္တရာဇာတ်");
  assert.ok(wethandaya.primaryCorrection);
  assert.equal(wethandaya.primaryCorrection.correctWords[0], "ဝေဿန္တရာဇာတ်");
  assert.ok(wethandaya.primaryCorrection.diff);
  // Critical regression check: diff syllables MUST join back to "ဝေဿန္တရာဇာတ်" (never dropping ဿ!)
  assert.equal(
    wethandaya.primaryCorrection.diff.map((d) => d.syllable).join(""),
    "ဝေဿန္တရာဇာတ်"
  );
});

test("exact headword search returns ONLY that exact entry without unrelated fuzzy results or irrelevant distinctions", () => {
  const tayasat = searchOrthography("တရစပ်");
  assert.equal(tayasat.hasExactMatch, true);
  assert.equal(tayasat.results.length, 1);
  assert.equal(tayasat.results[0].entry.w, "တရစပ်");
  assert.equal(tayasat.relatedDistinctions.length, 0);

  const tildeExpanded = expandTildeNote("ကတော့", "ဆီ~");
  assert.deepEqual(tildeExpanded, ["ဆီကတော့"]);

  const expandedSearch = searchOrthography("ဆီကတော့");
  assert.equal(expandedSearch.hasExactMatch, true);
  assert.ok(expandedSearch.results.some((r) => r.entry.w === "ကတော့"));
});

test("attested valid stems like သိပ္ပံ and ဥပမာ are never falsely marked wrong", () => {
  const theikpan = searchOrthography("သိပ္ပံ");
  assert.equal(theikpan.primaryCorrection, undefined);
  assert.equal(theikpan.hasExactMatch, true);
  assert.ok(theikpan.results.some((r) => r.entry.w.startsWith("သိပ္ပံ")));
});

test("explicit khwe-hta misspellings (မှား × → မှန်) resolve to authoritative spelling", () => {
  const r1 = searchOrthography("ကဇွန်းရွက်");
  assert.ok(r1.primaryCorrection);
  assert.equal(r1.primaryCorrection.sourceType, "khwe_misspelling");
  assert.deepEqual(r1.primaryCorrection.correctWords, ["ကန်စွန်းရွက်"]);
  assert.ok(r1.results.some((r) => r.entry.w === "ကန်စွန်းပင်"));

  const r2 = searchOrthography("ကုလားကာ");
  assert.ok(r2.primaryCorrection);
  assert.ok(
    r2.primaryCorrection.correctWords.includes("ကန့်လန့်ကာ") ||
      r2.primaryCorrection.correctWords.includes("ကန့်လန့်ကာ")
  );
});

test("phonetic & orthographic normalization auto-corrects common Myanmar misspellings", () => {
  const patWanKyin = searchOrthography("ပက်ဝန်းကျင်");
  assert.ok(patWanKyin.primaryCorrection);
  assert.ok(patWanKyin.primaryCorrection.correctWords.includes("ပတ်ဝန်းကျင်"));
  assert.equal(patWanKyin.results[0].entry.w, "ပတ်ဝန်းကျင်");

  const aThae = searchOrthography("အသဲနှလုံး");
  assert.ok(aThae.primaryCorrection);
  assert.ok(aThae.primaryCorrection.correctWords.includes("အသည်းနှလုံး"));

  const aChyi = searchOrthography("အချီးနှီး");
  assert.ok(aChyi.primaryCorrection);
  assert.ok(aChyi.primaryCorrection.correctWords.includes("အချည်းနှီး"));

  const nyan = searchOrthography("ညဏ်");
  assert.ok(nyan.primaryCorrection);
  assert.ok(nyan.primaryCorrection.correctWords.includes("ဉာဏ်"));

  const manak = searchOrthography("မနက်ဖန်");
  assert.ok(manak.primaryCorrection);
  assert.ok(manak.primaryCorrection.correctWords.includes("မနက်ဖြန်"));

  const adhippay = searchOrthography("အဓိပ္ပါယ်");
  assert.ok(adhippay.primaryCorrection);
  assert.ok(adhippay.primaryCorrection.correctWords.includes("အဓိပ္ပာယ်"));

  const pyathana = searchOrthography("ပြသနာ");
  assert.ok(pyathana.primaryCorrection);
  assert.ok(pyathana.primaryCorrection.correctWords.includes("ပြဿနာ"));
  assert.equal(
    pyathana.primaryCorrection.diff?.map((d) => d.syllable).join(""),
    "ပြဿနာ"
  );
});

test("တစ် vs တ rule confusions are automatically caught and corrected", () => {
  const taPhat = searchOrthography("တဖက်သတ်");
  assert.ok(taPhat.primaryCorrection);
  assert.ok(taPhat.primaryCorrection.correctWords.includes("တစ်ဖက်သတ်"));

  const tatPhyay = searchOrthography("တစ်ဖြည်းဖြည်း");
  assert.ok(tatPhyay.primaryCorrection);
  assert.ok(tatPhyay.primaryCorrection.correctWords.includes("တဖြည်းဖြည်း"));
});

test("valid natural Burmese + English paragraph produces ZERO false error flags", () => {
  const validParagraph =
    "Chapter 1 ကို ဘာသာပြန်ပြီးတဲ့အခါ အခန်းတစ်ခန်းလုံးရဲ့ Markdown ဖိုင်ကို ပြန်ဖွင့်စစ်ပြီး မူရင်းစာပိုဒ်အားလုံး ပါဝင်ကြောင်း အတည်ပြုခိုင်းပါ။ အထူးသဖြင့် သိပ္ပံဆိုင်ရာ ဥပမာတွေ၊ ကတ်ပြားဖြစ်နိုင်ခြေတွက်ချက်မှုနဲ့ Evolution အကြောင်းရှင်းပြချက်တွေ မကျန်ခဲ့ဖို့ အရေးကြီးပါတယ်။";

  const tokens = checkPhraseOrthography(validParagraph);
  const flagged = tokens.filter(
    (t) => t.status === "correction" || t.status === "suggestion"
  );
  assert.deepEqual(
    flagged,
    [],
    `Expected zero false positives, but got: ${JSON.stringify(flagged)}`
  );
  assert.equal(tokens.map((t) => t.raw).join(""), validParagraph);
});

test("phrase orthography checker pinpoints real misspellings even when particles are attached without spaces", () => {
  const mixedText =
    "မနက်ဖန် ကဇွန်းရွက်နဲ့ ပက်ဝန်းကျင်ကို ဝေသန္တရာဇာတ်ထဲမှာ တဖက်သတ် မပြောဘဲ တစ်ဖြည်းဖြည်း လေ့လာပါ။";
  const tokens = checkPhraseOrthography(mixedText);

  const flaggedMap = new Map(
    tokens
      .filter((t) => t.status === "correction" || t.status === "suggestion")
      .map((t) => [t.raw, t.suggestions[0]])
  );

  assert.equal(flaggedMap.get("မနက်ဖန်"), "မနက်ဖြန်");
  assert.equal(flaggedMap.get("ကဇွန်းရွက်"), "ကန်စွန်းရွက်");
  assert.equal(flaggedMap.get("ပက်ဝန်းကျင်"), "ပတ်ဝန်းကျင်");
  assert.equal(flaggedMap.get("ဝေသန္တရာဇာတ်"), "ဝေဿန္တရာဇာတ်");
  assert.equal(flaggedMap.get("တဖက်သတ်"), "တစ်ဖက်သတ်");
  assert.equal(flaggedMap.get("တစ်ဖြည်းဖြည်း"), "တဖြည်းဖြည်း");

  // Replacing all flagged tokens preserves attached particles ("နဲ့", "ကို", "ထဲမှာ") intact!
  const correctedSentence = tokens
    .map((t) =>
      t.status === "correction" || t.status === "suggestion"
        ? t.suggestions[0]
        : t.raw
    )
    .join("");
  assert.equal(
    correctedSentence,
    "မနက်ဖြန် ကန်စွန်းရွက်နဲ့ ပတ်ဝန်းကျင်ကို ဝေဿန္တရာဇာတ်ထဲမှာ တစ်ဖက်သတ် မပြောဘဲ တဖြည်းဖြည်း လေ့လာပါ။"
  );
});

test("Zawgyi input is automatically detected and converted to Unicode", () => {
  const zg =
    "\u1000\u1014\u1039\u1005\u103C\u1014\u1039\u1038\u101B\u103C\u1000\u1039";
  const norm = normalizeMyanmarInput(zg);
  assert.equal(norm.wasZawgyi, true);
  assert.equal(norm.normalized, "ကန်စွန်းရွက်");
});

test("Wiktionary Myanmar dictionary parser extracts clean definitions, examples, synonyms, and English gloss", () => {
  const sampleExtract = `
== ဗမာ ==
တရစပ်

=== ကြိယာဝိသေသန ===
တရစပ် (ta.ra.cap)

adverb of condition
စပ်
တရ(part)+စပ်(v)

current
အဆက်မပြတ်။ မပြတ်မလပ်။
တရစပ်ပစ်ခတ်နေသည့် ကျည်ဆန်များအကြားတွင်။ စစ်သား၊ ဒု။ ၁၈၅။

==== ကြောင်းတူသံကွဲများ ====
တရဟော,ဆက်တိုက်,တောက်လျှောက်,(all adverbs)

==== အင်္ဂလိပ် ====
continuously; unceasingly.
`;
  const parsed = parseMyWiktionaryExtract("တရစပ်", sampleExtract);
  assert.ok(parsed);
  assert.equal(parsed.senses.length, 1);
  assert.equal(parsed.senses[0].pos, "ကြိယာဝိသေသန");
  assert.equal(parsed.senses[0].definition, "အဆက်မပြတ်။ မပြတ်မလပ်။");
  assert.deepEqual(parsed.synonyms, ["တရဟော", "ဆက်တိုက်", "တောက်လျှောက်"]);
  assert.equal(parsed.english, "continuously; unceasingly.");
});

test("syllable splitter and spelling diff mark changed syllables accurately", () => {
  const syls = splitMyanmarSyllables("ပတ်ဝန်းကျင်");
  assert.deepEqual(syls, ["ပတ်", "ဝန်း", "ကျင်"]);

  const diff = computeSpellingDiff("ပက်ဝန်းကျင်", "ပတ်ဝန်းကျင်");
  assert.deepEqual(diff, [
    { syllable: "ပတ်", changed: true },
    { syllable: "ဝန်း", changed: false },
    { syllable: "ကျင်", changed: false },
  ]);
});

test("dataset passes 100% diacritic integrity and stacked subscript ္န audit", () => {
  const orphanMarkRegex = /(?:^|[\s၊။()\-~\[])[ျြွှေိီုူဲါာံ့း်္]/;

  for (const e of orthographyDataset.entries) {
    assert.equal(
      orphanMarkRegex.test(e.w),
      false,
      `Orphan combining mark in headword: ${e.w}`
    );
    assert.equal(
      e.w.includes("~"),
      false,
      `Unexpected tilde in headword: ${e.w}`
    );
    if (e.n) {
      assert.equal(
        orphanMarkRegex.test(e.n),
        false,
        `Orphan combining mark in note for ${e.w}: ${e.n}`
      );
    }
  }

  for (const d of orthographyDataset.distinctions) {
    assert.equal(
      orphanMarkRegex.test(d.l),
      false,
      `Orphan combining mark in distinction #${d.id} left: ${d.l}`
    );
    assert.equal(
      orphanMarkRegex.test(d.r),
      false,
      `Orphan combining mark in distinction #${d.id} right: ${d.r}`
    );
  }

  const entryWords = new Set(orthographyDataset.entries.map((e) => e.w));
  for (const restored of [
    "ပိန္နဲပင်",
    "မဟာပိန္နဲ",
    "သန္နိဋ္ဌာန်",
    "သန္နိပါတ်နာ",
    "အဒိန္နာဒါန်",
    "ကလာပ်",
    "ကျိန်း",
    "ဉာဏ်",
    "ချဉ်",
  ]) {
    assert.equal(entryWords.has(restored), true, `Missing ${restored}`);
  }
});

test("inflected / suffixed word search resolves cleanly to base headword or corrected inflected form", () => {
  const verbInflected = searchOrthography("စဉ်းစားသည်");
  assert.equal(verbInflected.hasExactMatch, true);
  assert.equal(verbInflected.primaryCorrection, undefined);
  assert.ok(verbInflected.resolvedInflection);
  assert.equal(verbInflected.resolvedInflection.baseHeadword, "စဉ်းစား-");
  assert.equal(verbInflected.results[0].entry.w, "စဉ်းစား");

  const nounSuffixed = searchOrthography("ပတ်ဝန်းကျင်မှာ");
  assert.equal(nounSuffixed.hasExactMatch, true);
  assert.equal(nounSuffixed.primaryCorrection, undefined);
  assert.ok(nounSuffixed.resolvedInflection);
  assert.equal(nounSuffixed.resolvedInflection.baseHeadword, "ပတ်ဝန်းကျင်");

  const wrongInflected = searchOrthography("ပက်ဝန်းကျင်မှာ");
  assert.ok(wrongInflected.primaryCorrection);
  assert.deepEqual(wrongInflected.primaryCorrection.correctWords, [
    "ပတ်ဝန်းကျင်မှာ",
  ]);
});

test("context-sensitive Burmese particle rules catch errors with zero false positives on valid guards", () => {
  // Single-word search checks
  const maSwarPae = searchOrthography("မသွားပဲ");
  assert.ok(maSwarPae.primaryCorrection);
  assert.equal(maSwarPae.primaryCorrection.sourceType, "particle_rule");
  assert.deepEqual(maSwarPae.primaryCorrection.correctWords, ["မသွားဘဲ"]);

  const maThiPhu = searchOrthography("မသိဖူး");
  assert.ok(maThiPhu.primaryCorrection);
  assert.deepEqual(maThiPhu.primaryCorrection.correctWords, ["မသိဘူး"]);

  const taYaukThae = searchOrthography("တစ်ယောက်ထဲ");
  assert.ok(taYaukThae.primaryCorrection);
  assert.deepEqual(taYaukThae.primaryCorrection.correctWords, ["တစ်ယောက်တည်း"]);

  const barLae = searchOrthography("ဘာလည်း");
  assert.ok(barLae.primaryCorrection);
  assert.deepEqual(barLae.primaryCorrection.correctWords, ["ဘာလဲ"]);

  // Paragraph checker with particle errors
  const errPara =
    "သူ တစ်ယောက်ထဲ ဘာမှ မပြောပဲ ထွက်သွားတာ ဘာကြောင့်လည်း။ ကျွန်တော် မသိဖူး။";
  const replacedErrPara = checkPhraseOrthography(errPara)
    .map((t) =>
      t.status === "correction" || t.status === "suggestion"
        ? t.suggestions[0]
        : t.raw
    )
    .join("");
  assert.equal(
    replacedErrPara,
    "သူ တစ်ယောက်တည်း ဘာမှ မပြောဘဲ ထွက်သွားတာ ဘာကြောင့်လဲ။ ကျွန်တော် မသိဘူး။"
  );

  // Valid guard sentences MUST produce zero false flags
  const validGuardPara =
    "မနက်ပဲ တစ်ခန်းထဲမှာ ထိုင်ရင်း ဘာလည်း မသိဘူး၊ အဲဒီနေရာကို တစ်ခါမှ မသွားဖူးဘူး။";
  const guardFlags = checkPhraseOrthography(validGuardPara).filter(
    (t) => t.status === "correction" || t.status === "suggestion"
  );
  assert.deepEqual(
    guardFlags,
    [],
    `Expected zero false positives on guard paragraph, got: ${JSON.stringify(guardFlags)}`
  );
});

test("homophone quick-switch alternatives return strict tone-preserving homophones without cluttering exact results", () => {
  const chyi = searchOrthography("ချည်");
  assert.equal(chyi.hasExactMatch, true);
  assert.ok(chyi.results.every((r) => r.entry.w === "ချည်"));
  const altWords = chyi.homophoneAlternatives.map((e) => e.w);
  assert.ok(altWords.includes("ချဉ်"));
  assert.ok(altWords.includes("ခြည်"));
});

