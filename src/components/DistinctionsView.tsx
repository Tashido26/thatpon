import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CONSONANT_ORDER } from "../data/bookRules";
import {
  DistinctionPair,
  DistinctionType,
  orthographyDataset,
} from "../data/orthographyLoader";
import { normalizeMyanmarInput } from "../utils/zawgyiNormalize";

interface DistinctionsViewProps {
  initialFilter?: string;
}

type TypeFilter = "all" | DistinctionType;

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "အားလုံး" },
  { id: "misspelling", label: "အမှား → အမှန်" },
  { id: "compare", label: "အသံတူ・အရေးကွဲ" },
  { id: "dual", label: "အရေးနှစ်မျိုး" },
  { id: "xref", label: "ပြန်ညွှန်း" },
];

function getTypeCaption(t: DistinctionType): string {
  switch (t) {
    case "misspelling":
      return "ရေးထုံးအမှား → အမှန်";
    case "dual":
      return "အရေးနှစ်မျိုးလုံး အမှန်";
    case "xref":
      return "ပြန်ညွှန်း";
    default:
      return "အသံတူ・အနက်နှင့် အရေးကွဲ";
  }
}

export const DistinctionsView: React.FC<DistinctionsViewProps> = ({
  initialFilter = "",
}) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [consonantFilter, setConsonantFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState(initialFilter);

  const availableConsonants = useMemo(() => {
    const set = new Set(orthographyDataset.distinctions.map((d) => d.c));
    return CONSONANT_ORDER.filter((c) => set.has(c));
  }, []);

  const filteredPairs = useMemo(() => {
    const normQ = normalizeMyanmarInput(searchText).normalized.trim();
    return orthographyDataset.distinctions.filter((d: DistinctionPair) => {
      if (typeFilter !== "all" && d.t !== typeFilter) return false;
      if (consonantFilter !== "all" && d.c !== consonantFilter) return false;
      if (normQ && !d.l.includes(normQ) && !d.r.includes(normQ)) return false;
      return true;
    });
  }, [typeFilter, consonantFilter, searchText]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div>
        <h1 className="mm-display text-2xl font-bold text-neutral-950 sm:text-3xl">
          ခွဲထားအညွှန်း ({orthographyDataset.distinctions.length})
        </h1>
        <p className="mm-text mt-1 max-w-2xl text-sm text-neutral-600">
          သတ်ပုံကျမ်း နောက်ဆက်တွဲ ခွဲထားအပိုင်း (စာမျက်နှာ ၁၃၇–၂၆၄) ပါ ရေးထုံးအမှားမှ
          အမှန်ညွှန်ပြချက်များ၊ အသံထွက်တူ အနက်ကွဲများနှင့် အရေးနှစ်မျိုးရှိသော ပုဒ်များ။
        </p>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="mt-6 space-y-4 border-y border-neutral-200 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-neutral-100 p-1">
            {TYPE_TABS.map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`mm-text rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-white text-neutral-950 font-semibold shadow-xs"
                      : "text-neutral-600 hover:text-neutral-950"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <label htmlFor="khwe-filter-input" className="sr-only">
              ခွဲထားပုဒ်များ စစ်ထုတ်ရှာဖွေရန်
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="khwe-filter-input"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ခွဲထားထဲမှ စာလုံးရှာရန်..."
              className="mm-text w-full rounded-lg border border-neutral-300 bg-white py-1.5 pl-9 pr-8 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-900 focus:outline-none"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                aria-label="စစ်ထုတ်စာသား ရှင်းရန်"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Consonant Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setConsonantFilter("all")}
            className={`mm-text rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              consonantFilter === "all"
                ? "bg-blue-950 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            က–အ အားလုံး
          </button>
          {availableConsonants.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConsonantFilter(c)}
              aria-label={`အက္ခရာ ${c} ခွဲထားပုဒ်များ`}
              className={`mm-text min-w-[34px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                consonantFilter === c
                  ? "bg-blue-950 text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span className="mm-text">
          ပြသနေသော ခွဲထားအတွဲ —{" "}
          <span className="num-tabular font-semibold text-neutral-900">
            {filteredPairs.length}
          </span>{" "}
          တွဲ
        </span>
      </div>

      {/* Results List */}
      {filteredPairs.length === 0 ? (
        <div className="py-14 text-center">
          <p className="mm-text text-sm text-neutral-600">
            ရွေးချယ်ထားသော စစ်ထုတ်မှုနှင့် ကိုက်ညီသည့် ခွဲထားပုဒ် မတွေ့ရှိပါ။
          </p>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200">
          {filteredPairs.slice(0, 120).map((pair) => (
            <article key={pair.id} className="py-5">
              <div className="mm-text mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                <div>
                  <span>အက္ခရာ {pair.c}</span>
                  <span aria-hidden="true"> · </span>
                  <span
                    className={
                      pair.t === "misspelling"
                        ? "font-semibold text-blue-950"
                        : "text-neutral-600"
                    }
                  >
                    {getTypeCaption(pair.t)}
                  </span>
                </div>
                <span className="num-tabular">စာမျက်နှာ {pair.p}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-8">
                <div>
                  <div className="mm-text text-xs font-medium text-neutral-500 mb-0.5">
                    {pair.t === "misspelling"
                      ? "မှားတတ်သော ရေးထုံး (အမှား ×)"
                      : "လက်ဝဲဘက် ယှဉ်တွဲပုဒ် (အမှန်)"}
                  </div>
                  <p
                    className={`mm-text text-base ${
                      pair.t === "misspelling"
                        ? "text-rose-900 line-through decoration-rose-700/60"
                        : "text-neutral-950 font-medium"
                    }`}
                  >
                    {pair.l}
                  </p>
                </div>

                <div>
                  <div className="mm-text text-xs font-medium text-neutral-500 mb-0.5">
                    {pair.t === "misspelling"
                      ? "သတ်ပုံကျမ်းပါ ရေးထုံးအမှန် (အမှန် ✓)"
                      : pair.t === "xref"
                      ? "ပြန်ညွှန်းချက်"
                      : "လက်ယာဘက် ယှဉ်တွဲပုဒ် (အမှန်)"}
                  </div>
                  <p className="mm-text text-base font-semibold text-neutral-950">
                    {pair.r}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
