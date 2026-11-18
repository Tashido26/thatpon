import React, { useEffect, useState } from "react";
import { Bookmark, BookOpen, Check, Copy } from "lucide-react";
import {
  fetchWordMeaning,
  WordMeaningData,
} from "../utils/dictionaryMeaning";
import { ExpandedEntry, SyllableDiffPart } from "../utils/orthographySearch";

interface EntryRowProps {
  entry: ExpandedEntry;
  reasonLabel?: string;
  diff?: SyllableDiffPart[];
  isBookmarked: boolean;
  onToggleBookmark: (entry: ExpandedEntry) => void;
  onSelectWord?: (word: string) => void;
  autoLoadMeaning?: boolean;
}

export const EntryRow: React.FC<EntryRowProps> = ({
  entry,
  reasonLabel,
  diff,
  isBookmarked,
  onToggleBookmark,
  onSelectWord,
  autoLoadMeaning = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [meaningExpanded, setMeaningExpanded] = useState(autoLoadMeaning);
  const [meaningLoading, setMeaningLoading] = useState(autoLoadMeaning);
  const [meaningData, setMeaningData] = useState<WordMeaningData | null>(null);
  const [meaningChecked, setMeaningChecked] = useState(false);

  useEffect(() => {
    setMeaningExpanded(autoLoadMeaning);
    setMeaningChecked(false);
    setMeaningData(null);

    if (!autoLoadMeaning) {
      setMeaningLoading(false);
      return;
    }

    let cancelled = false;
    setMeaningLoading(true);
    fetchWordMeaning(entry.w, entry.expandedNotes).then((data) => {
      if (cancelled) return;
      setMeaningData(data);
      setMeaningLoading(false);
      setMeaningChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [entry.w, entry.expandedNotes, autoLoadMeaning]);

  const handleToggleMeaning = async () => {
    const nextOpen = !meaningExpanded;
    setMeaningExpanded(nextOpen);
    if (nextOpen && !meaningChecked && !meaningLoading) {
      setMeaningLoading(true);
      const data = await fetchWordMeaning(entry.w, entry.expandedNotes);
      setMeaningData(data);
      setMeaningLoading(false);
      setMeaningChecked(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.w);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  const cleanBookMeaningNote =
    entry.n && !entry.n.includes("~") ? entry.n : undefined;

  return (
    <article className="py-5 first:pt-2 last:pb-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {onSelectWord ? (
              <button
                type="button"
                onClick={() => onSelectWord(entry.w)}
                className="mm-text text-left text-2xl font-bold text-neutral-950 hover:text-blue-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
              >
                {diff && diff.some((d) => d.changed) ? (
                  <span>
                    {diff.map((part, i) => (
                      <span
                        key={i}
                        className={
                          part.changed
                            ? "underline decoration-blue-800 decoration-2 underline-offset-6 text-blue-950"
                            : ""
                        }
                      >
                        {part.syllable}
                      </span>
                    ))}
                    {entry.v ? "-" : ""}
                  </span>
                ) : (
                  <span>{entry.displayHeadword}</span>
                )}
              </button>
            ) : (
              <h3 className="mm-text text-2xl font-bold text-neutral-950">
                {entry.displayHeadword}
              </h3>
            )}

            {entry.n && (
              <span className="mm-text text-base text-neutral-700">
                ({entry.n})
              </span>
            )}
          </div>

          {entry.expandedNotes.length > 0 && (
            <p className="mm-text mt-1 text-sm text-neutral-600">
              တွဲဖက်အသုံး —{" "}
              <span className="font-medium text-neutral-900">
                {entry.expandedNotes.join("၊ ")}
              </span>
            </p>
          )}

          {/* Clean unboxed inline metadata separated by middots */}
          <div className="mm-text mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
            {reasonLabel && (
              <>
                <span className="font-medium text-blue-900">{reasonLabel}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>ကာရန်: {entry.r}</span>
            <span aria-hidden="true">·</span>
            <span>{entry.v ? `ကြိယာ (${entry.w}သည်)` : "နာမ် / ပုဒ်"}</span>
            <span aria-hidden="true">·</span>
            <span className="num-tabular">ကျမ်းစာမျက်နှာ {entry.p}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {!autoLoadMeaning && (
            <button
              type="button"
              onClick={handleToggleMeaning}
              aria-expanded={meaningExpanded}
              className="mm-text inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{meaningExpanded ? "အဓိပ္ပာယ်ပိတ်ရန်" : "အဓိပ္ပာယ်"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            aria-label={`${entry.w} စာလုံးကူးယူရန်`}
            className="mm-text inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                <span>ကူးယူပြီး</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ကူးယူ</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(entry)}
            aria-label={
              isBookmarked
                ? `${entry.w} မှတ်သားမှုမှ ဖယ်ရှားရန်`
                : `${entry.w} မှတ်သားထားရန်`
            }
            aria-pressed={isBookmarked}
            className={`mm-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              isBookmarked
                ? "border-blue-900 bg-blue-950 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isBookmarked ? "မှတ်သားပြီး" : "မှတ်သားရန်"}</span>
          </button>
        </div>
      </div>

      {/* Word Meaning Section (အဓိပ္ပာယ်ဖွင့်ဆိုချက်) */}
      {meaningExpanded && (
        <div className="mm-text mt-4 border-t border-neutral-100 pt-3.5 text-sm">
          {meaningLoading ? (
            <p className="text-xs text-neutral-500">
              အဘိဓာန် အဓိပ္ပာယ် ရှာဖွေနေပါသည်...
            </p>
          ) : meaningData &&
            (meaningData.senses.length > 0 || meaningData.english) ? (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-neutral-500">
                အဓိပ္ပာယ်ဖွင့်ဆိုချက်
                {meaningData.matchedTitle !== entry.w
                  ? ` (ပင်မပုဒ် — ${meaningData.matchedTitle})`
                  : ""}
              </div>

              {meaningData.senses.map((sense, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-base text-neutral-950">
                    <span className="mr-2 text-xs font-semibold text-blue-900">
                      [{sense.pos}]
                    </span>
                    <span className="font-medium">{sense.definition}</span>
                  </p>
                  {sense.example && (
                    <p className="text-xs text-neutral-600">
                      သာဓက — {sense.example}
                    </p>
                  )}
                </div>
              ))}

              {meaningData.synonyms.length > 0 && (
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-800">
                    ကြောင်းတူသံကွဲ —{" "}
                  </span>
                  {meaningData.synonyms.join("၊ ")}
                </p>
              )}

              {meaningData.english && (
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-800">
                    English —{" "}
                  </span>
                  {meaningData.english}
                </p>
              )}
            </div>
          ) : cleanBookMeaningNote ? (
            <div>
              <span className="text-xs font-semibold text-neutral-500">
                အဓိပ္ပာယ် / အနက်အညွှန်း —{" "}
              </span>
              <span className="font-medium text-neutral-900">
                {cleanBookMeaningNote}
              </span>
            </div>
          ) : entry.expandedNotes.length > 0 ? (
            <div>
              <span className="text-xs font-semibold text-neutral-500">
                အသုံးအနှုန်း —{" "}
              </span>
              <span className="font-medium text-neutral-900">
                {entry.expandedNotes.join("၊ ")}
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              သတ်ပုံကျမ်းတွင် စာလုံးပေါင်းအမှန် တည်ပုဒ်အဖြစ်သာ ပြဆိုထားပြီး သီးခြားအနက်ဖွင့်ဆိုချက် မပါရှိပါ။
            </p>
          )}
        </div>
      )}
    </article>
  );
};
