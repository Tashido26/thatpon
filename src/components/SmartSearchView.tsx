import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Search,
  X,
} from "lucide-react";
import { DistinctionPair, orthographyDataset } from "../data/orthographyLoader";
import { ExpandedEntry, SmartSearchOutcome } from "../utils/orthographySearch";
import { SavedBookmarkRecord, SearchHistoryRecord } from "../utils/storage";
import { EntryRow } from "./EntryRow";

interface SmartSearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  onCommitSearch: (q: string, outcome: SmartSearchOutcome) => void;
  outcome: SmartSearchOutcome;
  history: SearchHistoryRecord[];
  bookmarks: SavedBookmarkRecord[];
  onToggleBookmark: (entry: ExpandedEntry) => void;
  onRemoveHistoryItem: (query: string) => void;
  onClearHistory: () => void;
  onNavigateDistinctions: (initialFilter?: string) => void;
}

function getDistinctionLabel(t: DistinctionPair["t"]): string {
  switch (t) {
    case "misspelling":
      return "အမှား → အမှန် ညွှန်ပြချက်";
    case "dual":
      return "အရေးနှစ်မျိုး ယှဉ်တွဲချက်";
    case "xref":
      return "ပြန်ညွှန်းချက်";
    default:
      return "အသံတူ・အရေးကွဲ နှိုင်းယှဉ်ချက်";
  }
}

export const SmartSearchView: React.FC<SmartSearchViewProps> = ({
  query,
  onQueryChange,
  onCommitSearch,
  outcome,
  history,
  bookmarks,
  onToggleBookmark,
  onRemoveHistoryItem,
  onClearHistory,
  onNavigateDistinctions,
}) => {
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  const isBookmarked = (entry: ExpandedEntry) =>
    bookmarks.some(
      (b) => b.headword === entry.w && b.bookPage === entry.p
    );

  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word);
      setCopiedWord(word);
      window.setTimeout(() => setCopiedWord(null), 1600);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onCommitSearch(query, outcome);
    }
  };

  const handleQuickPick = (val: string) => {
    onQueryChange(val);
  };

  const hasActiveQuery = outcome.normalizedQuery.length > 0;
  const hasRelevantDistinctions = outcome.relatedDistinctions.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Hero / Focal Search Anchor */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="mm-text text-xs font-medium text-neutral-500">
          <span>မြန်မာစာအဖွဲ့ဦးစီးဌာန</span>
          <span aria-hidden="true"> · </span>
          <span>ဒုတိယအကြိမ် (၂၀၀၃ ခုနှစ်)</span>
          <span aria-hidden="true"> · </span>
          <span className="num-tabular">
            တည်ပုဒ်ပေါင်း {orthographyDataset.entries.length.toLocaleString()}
          </span>
        </p>

        <h1 className="mm-display mt-3 text-2xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
          မသဲကွဲသော စာလုံးပေါင်းကို အလွယ်တကူ ရှာဖွေပါ
        </h1>

        <p className="mm-text mx-auto mt-3 max-w-2xl text-sm text-neutral-600 sm:text-base">
          သတ်ပုံအတိအကျ မသိသေးသော်လည်း အသံထွက်အတိုင်း ရိုက်ထည့်ရှာဖွေနိုင်ပါသည်။
          စာလုံးပေါင်းမှားနေလျှင်လည်း သတ်ပုံကျမ်းပါ ရေးထုံးအမှန်ကို အလိုအလျောက်
          တိုက်ဆိုင်ဖော်ပြပေးပါသည်။
        </p>

        <form onSubmit={handleSubmit} className="mt-8 text-left">
          <label htmlFor="orthography-search-input" className="sr-only">
            မြန်မာစာလုံးပေါင်း ရှာဖွေရန်
          </label>
          <div className="relative flex items-center rounded-xl border border-neutral-300 bg-white shadow-xs focus-within:border-blue-900 focus-within:ring-2 focus-within:ring-blue-900/15 transition-all">
            <Search
              className="ml-4 h-5 w-5 shrink-0 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="orthography-search-input"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onBlur={() => {
                if (query.trim()) onCommitSearch(query, outcome);
              }}
              placeholder="စာလုံးပေါင်း ရိုက်ထည့်ရှာဖွေပါ..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="mm-text w-full bg-transparent px-3.5 py-4 text-lg text-neutral-950 placeholder:text-neutral-400 focus:outline-none sm:text-xl"
            />
            {!query ? (
              <kbd
                aria-hidden="true"
                className="mr-3 hidden select-none rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-400 sm:inline-block"
              >
                /
              </kbd>
            ) : (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="ရှာဖွေစာသား ရှင်းလင်းရန်"
                className="mr-2 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="mm-text mr-2 rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0"
            >
              ရှာဖွေရန်
            </button>
          </div>

          {outcome.wasZawgyi && (
            <p className="mm-text mt-2 text-xs text-blue-900">
              ဇော်ဂျီလက်ကွက်ဖြင့် ရိုက်ထည့်ထားသည်ကို ယူနီကုဒ် (“{outcome.normalizedQuery}”) သို့ အလိုအလျောက် ပြောင်းလဲရှာဖွေပေးထားပါသည်။
            </p>
          )}
        </form>
      </section>

      {/* Clean Empty State: Browser Search History Only */}
      {!hasActiveQuery ? (
        history.length > 0 ? (
          <section className="mx-auto mt-12 max-w-3xl border-t border-neutral-200 pt-8">
            <div className="flex items-center justify-between">
              <h2 className="mm-display text-sm font-bold text-neutral-950">
                လတ်တလော ရှာဖွေမှတ်တမ်း
              </h2>
              <button
                type="button"
                onClick={onClearHistory}
                className="mm-text text-xs font-medium text-neutral-500 hover:text-rose-700 transition-colors"
              >
                အားလုံးဖျက်ရန်
              </button>
            </div>

            <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white px-4">
              {history.slice(0, 8).map((item) => (
                <li
                  key={item.query}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleQuickPick(item.query)}
                    className="mm-text min-w-0 flex-1 truncate text-left text-sm text-neutral-800 hover:text-blue-900"
                  >
                    <span className="font-semibold">{item.query}</span>
                    {item.resolvedCorrect &&
                      item.resolvedCorrect !== item.query && (
                        <span className="ml-2 text-xs font-medium text-blue-900">
                          → {item.resolvedCorrect}
                        </span>
                      )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveHistoryItem(item.query)}
                    aria-label={`${item.query} ကို မှတ်တမ်းမှ ဖယ်ရှားရန်`}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      ) : (
        /* Active Search Results Layout */
        <div
          className={`mx-auto mt-10 border-t border-neutral-200 pt-8 ${
            hasRelevantDistinctions ? "max-w-6xl" : "max-w-3xl"
          }`}
        >
          {/* Primary Auto-Correction / Exact Match Resolution Banner */}
          {outcome.primaryCorrection ? (
            <section
              aria-label="အလိုအလျောက် သတ်ပုံအမှန် ညွှန်ပြချက်"
              className="mb-8 rounded-xl border border-neutral-300 bg-neutral-50/90 p-5 sm:p-6"
            >
              <div className="mm-text flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
                <span className="font-semibold text-blue-950">
                  {outcome.primaryCorrection.sourceType === "khwe_misspelling"
                    ? "ခွဲထားအညွှန်း အမှားပြင်ဆင်ချက်"
                    : outcome.primaryCorrection.sourceType === "tat_ta"
                    ? "တစ် / တ ရေးထုံးစည်းမျဉ်း ပြင်ဆင်ချက်"
                    : outcome.primaryCorrection.sourceType === "particle_rule"
                    ? "ပစ္စည်းစကားလုံး ရေးထုံးစည်းမျဉ်း ပြင်ဆင်ချက်"
                    : "အသံထွက်တူ သတ်ပုံအမှန် အကြံပြုချက်"}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  သင်ရှာသော “{outcome.primaryCorrection.wrongText}” အစား အောက်ပါ သတ်ပုံအမှန်ကို သုံးပါ
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <span className="mm-text text-base text-neutral-500 line-through decoration-rose-700/70">
                  အမှား: {outcome.primaryCorrection.wrongText}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-3">
                  {outcome.primaryCorrection.correctWords.map((cw, idx) => (
                    <div key={cw} className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickPick(cw)}
                        className="mm-text text-2xl font-bold text-neutral-950 hover:text-blue-900 sm:text-3xl"
                      >
                        အမှန်:{" "}
                        {idx === 0 && outcome.primaryCorrection?.diff ? (
                          <span>
                            {outcome.primaryCorrection.diff.map((d, di) => (
                              <span
                                key={di}
                                className={
                                  d.changed
                                    ? "underline decoration-blue-900 decoration-2 underline-offset-8 text-blue-950"
                                    : ""
                                }
                              >
                                {d.syllable}
                              </span>
                            ))}
                          </span>
                        ) : (
                          cw
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyWord(cw)}
                        aria-label={`${cw} သတ်ပုံအမှန် ကူးယူရန်`}
                        className="mm-text inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 whitespace-nowrap"
                      >
                        {copiedWord === cw ? (
                          <>
                            <Check
                              className="h-3.5 w-3.5 text-emerald-700"
                              aria-hidden="true"
                            />
                            <span>ကူးယူပြီး</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>ကူးယူ</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mm-text mt-3 text-sm text-neutral-700">
                {outcome.primaryCorrection.explanation}
              </p>
            </section>
          ) : (
            outcome.hasExactMatch && (
              <section
                aria-label="သတ်ပုံအမှန် အတည်ပြုချက်"
                className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/60 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  {outcome.resolvedInflection ? (
                    <p className="mm-text text-sm text-neutral-800">
                      <span className="font-bold text-neutral-950">
                        “{outcome.resolvedInflection.queriedForm}”
                      </span>{" "}
                      ၏ ပင်မတည်ပုဒ်{" "}
                      <span className="font-bold text-neutral-950">
                        “{outcome.resolvedInflection.baseHeadword}”
                      </span>{" "}
                      သည် သတ်ပုံကျမ်းဝင်{" "}
                      <span className="font-semibold text-emerald-800">
                        သတ်ပုံအမှန်
                      </span>{" "}
                      ဖြစ်ပါသည်။
                    </p>
                  ) : outcome.resolvedCompound ? (
                    <p className="mm-text text-sm text-neutral-800">
                      <span className="font-bold text-neutral-950">
                        “{outcome.resolvedCompound.queriedForm}”
                      </span>{" "}
                      သည် သတ်ပုံကျမ်းဝင်{" "}
                      <span className="font-bold text-neutral-950">
                        “{outcome.resolvedCompound.parts.join(" + ")}”
                      </span>{" "}
                      ပေါင်းစပ်ထားသော{" "}
                      <span className="font-semibold text-emerald-800">
                        သတ်ပုံအမှန်
                      </span>{" "}
                      ဖြစ်ပါသည်။
                    </p>
                  ) : (
                    <p className="mm-text text-sm text-neutral-800">
                      <span className="font-bold text-neutral-950">
                        “{outcome.normalizedQuery}”
                      </span>{" "}
                      သည် မြန်မာစာလုံးပေါင်းသတ်ပုံကျမ်းဝင်{" "}
                      <span className="font-semibold text-emerald-800">
                        သတ်ပုံအမှန်
                      </span>{" "}
                      ဖြစ်ပါသည်။
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWord(outcome.normalizedQuery)}
                  className="mm-text inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 whitespace-nowrap"
                >
                  {copiedWord === outcome.normalizedQuery ? (
                    <>
                      <Check
                        className="h-3.5 w-3.5 text-emerald-700"
                        aria-hidden="true"
                      />
                      <span>ကူးယူပြီး</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>စာလုံးကူးယူရန်</span>
                    </>
                  )}
                </button>
              </section>
            )
          )}

          {/* Results Grid: Single focused column unless genuinely relevant distinctions exist */}
          <div
            className={
              hasRelevantDistinctions
                ? "grid grid-cols-1 gap-10 lg:grid-cols-12"
                : ""
            }
          >
            <section className={hasRelevantDistinctions ? "lg:col-span-8" : ""}>
              <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3">
                <h2 className="mm-display text-base font-bold text-neutral-950">
                  {outcome.results.length === 1
                    ? "သတ်ပုံကျမ်းပါ တည်ပုဒ်နှင့် အဓိပ္ပာယ်"
                    : "သတ်ပုံကျမ်းပါ တည်ပုဒ်များ"}
                </h2>
                <span className="mm-text text-xs text-neutral-500">
                  တွေ့ရှိချက်{" "}
                  <span className="num-tabular font-semibold text-neutral-900">
                    {outcome.results.length}
                  </span>{" "}
                  ပုဒ်
                </span>
              </div>

              {outcome.results.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="mm-text text-base font-semibold text-neutral-800">
                    “{outcome.normalizedQuery}” နှင့် တိုက်ရိုက်တူသော တည်ပုဒ် မတွေ့ရှိပါ။
                  </p>
                  <p className="mm-text mt-2 text-sm text-neutral-500">
                    စကားလုံး၏ ရှေ့ပိုင်းစာလုံးဖြင့်သော်လည်းကောင်း၊ စာပိုဒ်စစ်ရန် ကဏ္ဍတွင် ဝါကျအလိုက်သော်လည်းကောင်း ရှာဖွေကြည့်နိုင်ပါသည်။
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-neutral-200">
                    {outcome.results.map((item, idx) => (
                      <EntryRow
                        key={item.entry.id}
                        entry={item.entry}
                        reasonLabel={item.reasonLabel}
                        diff={item.diff}
                        isBookmarked={isBookmarked(item.entry)}
                        onToggleBookmark={onToggleBookmark}
                        onSelectWord={
                          outcome.results.length > 1 ? handleQuickPick : undefined
                        }
                        autoLoadMeaning={idx < 4}
                      />
                    ))}
                  </div>

                  {/* Quiet Editorial Homophone Quick-Switch Strip (Zero-Pill Typography) */}
                  {outcome.homophoneAlternatives.length > 0 && (
                    <div className="mm-text mt-4 border-t border-neutral-200 pt-4 text-xs text-neutral-600">
                      <span className="font-medium text-neutral-500">
                        အသံထွက်တူ အခြားရေးထုံးများ —{" "}
                      </span>
                      {outcome.homophoneAlternatives.map((alt, idx) => (
                        <React.Fragment key={alt.id}>
                          {idx > 0 && (
                            <span
                              aria-hidden="true"
                              className="mx-2 text-neutral-300"
                            >
                              ·
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleQuickPick(alt.w)}
                            className="font-semibold text-blue-900 hover:text-blue-950 hover:underline transition-colors"
                          >
                            {alt.displayHeadword}
                            {alt.n ? ` (${alt.n})` : ""}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {hasRelevantDistinctions && (
              <aside className="lg:col-span-4">
                <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3">
                  <h2 className="mm-display text-base font-bold text-neutral-950">
                    သက်ဆိုင်ရာ ခွဲထားနှိုင်းယှဉ်ချက်
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateDistinctions(outcome.normalizedQuery)
                    }
                    className="mm-text text-xs font-medium text-blue-900 hover:underline whitespace-nowrap"
                  >
                    အားလုံးကြည့်ရန်
                  </button>
                </div>

                <div className="divide-y divide-neutral-200">
                  {outcome.relatedDistinctions.map((d) => (
                    <div key={d.id} className="py-4">
                      <div className="mm-text flex items-center justify-between text-xs text-neutral-500">
                        <span>{getDistinctionLabel(d.t)}</span>
                        <span className="num-tabular">စာမျက်နှာ {d.p}</span>
                      </div>

                      {d.t === "misspelling" ? (
                        <div className="mm-text mt-2 space-y-1.5 text-sm">
                          <p className="text-neutral-600">
                            <span className="font-semibold text-rose-800">
                              အမှား —{" "}
                            </span>
                            <span className="line-through">
                              {d.leftExcerpt}
                            </span>
                          </p>
                          <p className="text-neutral-950">
                            <span className="font-semibold text-emerald-800">
                              အမှန် —{" "}
                            </span>
                            <span className="font-semibold">
                              {d.rightExcerpt}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="mm-text mt-2 space-y-2 text-sm text-neutral-800">
                          <p className="font-medium text-neutral-950">
                            {d.leftExcerpt}
                          </p>
                          <p className="text-neutral-600">
                            နှိုင်းယှဉ် —{" "}
                            <span className="font-medium text-neutral-900">
                              {d.rightExcerpt}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
