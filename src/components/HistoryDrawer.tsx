import React, { useState } from "react";
import { Bookmark, Check, Clock, Copy, Trash2, X } from "lucide-react";
import { SavedBookmarkRecord, SearchHistoryRecord } from "../utils/storage";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: SearchHistoryRecord[];
  bookmarks: SavedBookmarkRecord[];
  onSelectQuery: (query: string) => void;
  onRemoveHistoryItem: (query: string) => void;
  onClearHistory: () => void;
  onRemoveBookmark: (headword: string, bookPage: number) => void;
  onClearBookmarks: () => void;
}

function toMyanmarDigits(n: number): string {
  const digits = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];
  return String(n)
    .split("")
    .map((ch) => (ch >= "0" && ch <= "9" ? digits[Number(ch)] : ch))
    .join("");
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  bookmarks,
  onSelectQuery,
  onRemoveHistoryItem,
  onClearHistory,
  onRemoveBookmark,
  onClearBookmarks,
}) => {
  const [section, setSection] = useState<"history" | "bookmarks">("history");
  const [copiedBookmarks, setCopiedBookmarks] = useState(false);

  const handleCopyBookmarksList = async () => {
    if (bookmarks.length === 0) return;
    const formatted = bookmarks
      .map((bm, idx) => {
        const hw = `${bm.headword}${bm.isVerb ? "-" : ""}${
          bm.note ? ` (${bm.note})` : ""
        }`;
        return `${toMyanmarDigits(idx + 1)}။ ${hw} — ကာရန်: ${bm.rhyme} · စာမျက်နှာ ${bm.bookPage}`;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedBookmarks(true);
      window.setTimeout(() => setCopiedBookmarks(false), 1600);
    } catch {
      // Ignore clipboard errors in restricted contexts
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral-950/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-heading"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2
            id="drawer-heading"
            className="mm-display text-base font-bold text-neutral-950"
          >
            ရှာဖွေမှတ်တမ်းနှင့် သိမ်းဆည်းထားမှုများ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="မှတ်တမ်းကန့်လန့်ကာ ပိတ်ရန်"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Functional segmented tab selector */}
        <div className="border-b border-neutral-200 px-6 py-3 bg-neutral-50/70">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200/70 p-1">
            <button
              type="button"
              onClick={() => setSection("history")}
              className={`mm-text inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                section === "history"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ရှာဖွေမှတ်တမ်း ({history.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSection("bookmarks")}
              className={`mm-text inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                section === "bookmarks"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              <span>မှတ်သားထားမှု ({bookmarks.length})</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {section === "history" ? (
            history.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mm-text text-sm text-neutral-600">
                  လက်ရှိ Browser တွင် ရှာဖွေထားသော မှတ်တမ်း မရှိသေးပါ။
                </p>
                <p className="mm-text mt-1 text-xs text-neutral-400">
                  သင်ရှာဖွေလိုက်သော စာလုံးပေါင်းများကို ဤနေရာတွင် အလိုအလျောက် မှတ်သားပေးပါမည်။
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="mm-text text-xs text-neutral-500">
                    Browser ထဲတွင် သိမ်းဆည်းထားသည်
                  </span>
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="mm-text inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>မှတ်တမ်းအားလုံးဖျက်ရန်</span>
                  </button>
                </div>

                <ul className="divide-y divide-neutral-200">
                  {history.map((item) => (
                    <li
                      key={item.query}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectQuery(item.query);
                          onClose();
                        }}
                        className="min-w-0 flex-1 text-left group"
                      >
                        <div className="mm-text flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-neutral-900 group-hover:text-blue-900">
                            {item.query}
                          </span>
                          {item.resolvedCorrect &&
                            item.resolvedCorrect !== item.query && (
                              <span className="text-xs font-semibold text-blue-900">
                                → အမှန်: {item.resolvedCorrect}
                              </span>
                            )}
                        </div>
                        <p className="mm-text text-xs text-neutral-500">
                          {item.wasExact
                            ? "သတ်ပုံအမှန် တွေ့ရှိ"
                            : item.resolvedCorrect
                            ? "အမှန်ပြင်ဆင်ချက် တွေ့ရှိ"
                            : "ရှာဖွေခဲ့သည်"}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveHistoryItem(item.query)}
                        aria-label={`${item.query} ကို မှတ်တမ်းမှ ဖျက်ရန်`}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : bookmarks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mm-text text-sm text-neutral-600">
                မှတ်သားထားသော စာလုံးပေါင်း မရှိသေးပါ။
              </p>
              <p className="mm-text mt-1 text-xs text-neutral-400">
                တည်ပုဒ်များဘေးရှိ “မှတ်သားရန်” ခလုတ်ကိုနှိပ်၍ သိမ်းဆည်းနိုင်ပါသည်။
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="mm-text text-xs text-neutral-500">
                  သိမ်းဆည်းထားသော တည်ပုဒ်များ
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyBookmarksList}
                    className="mm-text inline-flex items-center gap-1 text-xs font-medium text-blue-900 hover:text-blue-950 transition-colors whitespace-nowrap"
                  >
                    {copiedBookmarks ? (
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
                        <span>စာရင်းကူးယူရန်</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClearBookmarks}
                    className="mm-text inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>အားလုံးဖျက်ရန်</span>
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-neutral-200">
                {bookmarks.map((bm) => (
                  <li
                    key={`${bm.headword}-${bm.bookPage}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectQuery(bm.headword);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left group"
                    >
                      <div className="mm-text text-sm font-bold text-neutral-950 group-hover:text-blue-900">
                        {bm.headword}
                        {bm.isVerb ? "-" : ""}{" "}
                        {bm.note && (
                          <span className="font-normal text-neutral-600">
                            ({bm.note})
                          </span>
                        )}
                      </div>
                      <div className="mm-text text-xs text-neutral-500">
                        <span>ကာရန်: {bm.rhyme}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="num-tabular">
                          စာမျက်နှာ {bm.bookPage}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bm.headword, bm.bookPage)}
                      aria-label={`${bm.headword} ကို သိမ်းဆည်းမှုမှ ဖယ်ရှားရန်`}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
