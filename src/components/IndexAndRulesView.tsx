import React, { useMemo, useState } from "react";
import {
  BOOK_NOTATION_GUIDE,
  CONSONANT_GROUPS,
  TAT_TA_RULES,
} from "../data/bookRules";
import { orthographyDataset } from "../data/orthographyLoader";
import { ExpandedEntry, getOrthographyIndex } from "../utils/orthographySearch";
import { SavedBookmarkRecord } from "../utils/storage";
import { EntryRow } from "./EntryRow";

interface IndexAndRulesViewProps {
  bookmarks: SavedBookmarkRecord[];
  onToggleBookmark: (entry: ExpandedEntry) => void;
  onSelectSearchWord: (word: string) => void;
}

export const IndexAndRulesView: React.FC<IndexAndRulesViewProps> = ({
  bookmarks,
  onToggleBookmark,
  onSelectSearchWord,
}) => {
  const [subView, setSubView] = useState<"alphabet" | "rules">("alphabet");
  const [selectedConsonant, setSelectedConsonant] = useState<string>("က");
  const [selectedRhyme, setSelectedRhyme] = useState<string>("all");

  const idx = useMemo(() => getOrthographyIndex(), []);

  const rhymesForConsonant = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const e of idx.entries) {
      if (e.c === selectedConsonant && !seen.has(e.r)) {
        seen.add(e.r);
        list.push(e.r);
      }
    }
    return list;
  }, [idx, selectedConsonant]);

  const entriesForSelection = useMemo(() => {
    return idx.entries.filter((e) => {
      if (e.c !== selectedConsonant) return false;
      if (selectedRhyme !== "all" && e.r !== selectedRhyme) return false;
      return true;
    });
  }, [idx, selectedConsonant, selectedRhyme]);

  const isBookmarked = (entry: ExpandedEntry) =>
    bookmarks.some(
      (b) => b.headword === entry.w && b.bookPage === entry.p
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-6">
        <div>
          <h1 className="mm-display text-2xl font-bold text-neutral-950 sm:text-3xl">
            အက္ခရာစဉ်・ကာရန်မာတိကာနှင့် ရေးထုံးမူများ
          </h1>
          <p className="mm-text mt-1 text-sm text-neutral-600">
            က မှ အ အထိ ဗျည်း ၃၃ လုံး၊ ကာရန်အုပ်စုများနှင့် “တစ် / တ” ရေးထုံးဆိုင်ရာ မြန်မာစာအဖွဲ့၏
            တရားဝင်မူများ။
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 self-start shrink-0">
          <button
            type="button"
            onClick={() => setSubView("alphabet")}
            className={`mm-text rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subView === "alphabet"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            အက္ခရာနှင့် ကာရန်အညွှန်း
          </button>
          <button
            type="button"
            onClick={() => setSubView("rules")}
            className={`mm-text rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subView === "rules"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            တစ် / တ မူနှင့် ကျမ်းညွှန်း
          </button>
        </div>
      </div>

      {subView === "alphabet" ? (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left: Consonant Matrix (ဗျည်းစဉ်ဇယား) */}
          <aside className="lg:col-span-4 space-y-6">
            <div>
              <h2 className="mm-display mb-3 text-sm font-bold text-neutral-950">
                ဗျည်းစဉ်ဇယား (က – အ)
              </h2>

              <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                {CONSONANT_GROUPS.map((grp) => (
                  <div key={grp.label}>
                    <div className="mm-text text-[11px] text-neutral-500 mb-1">
                      {grp.label}
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {grp.letters.map((letter) => {
                        const active = selectedConsonant === letter;
                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => {
                              setSelectedConsonant(letter);
                              setSelectedRhyme("all");
                            }}
                            aria-label={`ဗျည်း ${letter}`}
                            className={`mm-text flex h-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                              active
                                ? "bg-blue-950 text-white"
                                : "border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rhyme Selector for Selected Consonant */}
            <div>
              <h2 className="mm-display text-sm font-bold text-neutral-950 mb-2">
                “{selectedConsonant}” ကာရန်အုပ်စုများ ({rhymesForConsonant.length})
              </h2>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRhyme("all")}
                    className={`mm-text rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedRhyme === "all"
                        ? "bg-blue-950 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    အားလုံး ({idx.entries.filter((e) => e.c === selectedConsonant).length})
                  </button>
                  {rhymesForConsonant.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRhyme(r)}
                      className={`mm-text rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedRhyme === r
                          ? "bg-blue-950 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right: Filtered Entries */}
          <section className="lg:col-span-8">
            <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3">
              <h2 className="mm-display text-base font-bold text-neutral-950">
                အက္ခရာ “{selectedConsonant}”{" "}
                {selectedRhyme !== "all" ? `· ကာရန် “${selectedRhyme}”` : ""} တည်ပုဒ်များ
              </h2>
              <span className="mm-text text-xs text-neutral-500">
                စုစုပေါင်း{" "}
                <span className="num-tabular font-semibold text-neutral-900">
                  {entriesForSelection.length}
                </span>{" "}
                ပုဒ်
              </span>
            </div>

            <div className="divide-y divide-neutral-200">
              {entriesForSelection.slice(0, 100).map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  isBookmarked={isBookmarked(entry)}
                  onToggleBookmark={onToggleBookmark}
                  onSelectWord={onSelectSearchWord}
                  autoLoadMeaning={false}
                />
              ))}
            </div>
            {entriesForSelection.length > 100 && (
              <p className="mm-text mt-4 text-xs text-neutral-500">
                ပထမဆုံး တည်ပုဒ် ၁၀၀ ကို ပြသထားပါသည်။ လက်ဝဲဘက်ရှိ ကာရန်အုပ်စုတစ်ခုချင်းစီကို
                နှိပ်၍ အသေးစိတ် ကြည့်ရှုနိုင်ပါသည်။
              </p>
            )}
          </section>
        </div>
      ) : (
        /* Official Book Rules & Reading Guide */
        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <section className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="mm-display text-lg font-bold text-neutral-950">
                “တစ်” အရေး နှင့် “တ” အရေး ခွဲခြားသတ်မှတ်ရေး မူ (၃) ရပ်
              </h2>
              <p className="mm-text mt-1 text-sm text-neutral-600">
                မြန်မာစာလုံးပေါင်းသတ်ပုံကျမ်း အမှာစာ (စာမျက်နှာ စ–ဆ) ပါ တရားဝင် ယေဘုယျမူများ —
              </p>
            </div>

            <div className="divide-y divide-neutral-200 border-t border-neutral-200">
              {TAT_TA_RULES.map((rule) => (
                <article key={rule.id} className="py-6">
                  <div className="mm-text text-xs font-semibold text-blue-900">
                    {rule.number}
                  </div>
                  <h3 className="mm-display mt-1 text-base font-bold text-neutral-950">
                    {rule.title}
                  </h3>
                  <p className="mm-text mt-2 text-sm text-neutral-700">
                    {rule.summary}
                  </p>
                  <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5">
                    <div className="mm-text text-xs font-medium text-neutral-500 mb-1">
                      သာဓကများ —
                    </div>
                    <ul className="mm-text space-y-1 text-sm text-neutral-900">
                      {rule.examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="mm-display text-lg font-bold text-neutral-950">
                သတ်ပုံကျမ်း အညွှန်းသင်္ကေတများ
              </h2>
              <p className="mm-text mt-1 text-sm text-neutral-600">
                ကျမ်းစာအုပ်အတွင်း အသုံးပြုထားသော သင်္ကေတများ၏ အဓိပ္ပာယ်ဖွင့်ဆိုချက် —
              </p>
            </div>

            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white px-5">
              {BOOK_NOTATION_GUIDE.map((item) => (
                <div key={item.symbol} className="py-4">
                  <h3 className="mm-text text-sm font-bold text-neutral-950">
                    <span className="num-tabular mr-2 font-bold text-blue-900">
                      {item.symbol}
                    </span>
                    {item.title}
                  </h3>
                  <p className="mm-text mt-1.5 text-xs text-neutral-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-5">
              <h3 className="mm-display text-sm font-bold text-neutral-950">
                ကျမ်းရင်း အချက်အလက်
              </h3>
              <dl className="mm-text mt-3 space-y-2 text-xs text-neutral-600">
                <div>
                  <dt className="font-semibold text-neutral-900">ကျမ်းအမည်</dt>
                  <dd>{orthographyDataset.meta.title}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-900">ထုတ်ဝေသူ</dt>
                  <dd>{orthographyDataset.meta.publisher}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-900">ပုံနှိပ်မှတ်တမ်း</dt>
                  <dd>{orthographyDataset.meta.edition}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
