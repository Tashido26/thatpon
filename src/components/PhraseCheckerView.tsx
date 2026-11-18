import React, { useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  RotateCcw,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  checkPhraseOrthography,
  PhraseCheckToken,
} from "../utils/orthographySearch";

interface PhraseCheckerViewProps {
  text: string;
  onTextChange: (nextText: string) => void;
  onClearDraft: () => void;
  onInspectWord: (word: string) => void;
}

const SAMPLE_PARAGRAPH =
  "မနက်ဖန် ကဇွန်းရွက်နဲ့ အသဲနှလုံးအကြောင်း တစ်ယောက်ထဲ တဖက်သတ် မပြောပဲ ပက်ဝန်းကျင်ကို တစ်ဖြည်းဖြည်း လေ့လာပါ။";

export const PhraseCheckerView: React.FC<PhraseCheckerViewProps> = ({
  text,
  onTextChange,
  onClearDraft,
  onInspectWord,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationNotice, setValidationNotice] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const tokens = useMemo(() => checkPhraseOrthography(text), [text]);

  const hasMyanmarInput = useMemo(
    () => tokens.some((t) => t.status !== "punctuation"),
    [tokens]
  );

  const flaggedCount = useMemo(
    () =>
      tokens.filter(
        (t) => t.status === "correction" || t.status === "suggestion"
      ).length,
    [tokens]
  );

  const handleReplaceToken = (tokenIndex: number, replacement: string) => {
    const updated = tokens
      .map((tok, idx) => (idx === tokenIndex ? replacement : tok.raw))
      .join("");
    onTextChange(updated);
    setSelectedIndex(null);
  };

  const handleApplyAllCorrections = () => {
    if (!text.trim()) {
      setValidationNotice("စစ်ဆေးလိုသော မြန်မာစာကြောင်းကို ဦးစွာ ရိုက်ထည့်ပါ။");
      return;
    }
    setValidationNotice("");
    const updated = tokens
      .map((tok) => {
        if (
          (tok.status === "correction" || tok.status === "suggestion") &&
          tok.suggestions.length > 0
        ) {
          return tok.suggestions[0];
        }
        return tok.raw;
      })
      .join("");
    onTextChange(updated);
    setSelectedIndex(null);
  };

  const handleCopyText = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleClearText = () => {
    onClearDraft();
    setSelectedIndex(null);
    setValidationNotice("");
    setCopied(false);
    textareaRef.current?.focus();
  };

  const activeToken: PhraseCheckToken | null =
    selectedIndex !== null && tokens[selectedIndex]
      ? tokens[selectedIndex]
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-3xl">
        <h1 className="mm-display text-2xl font-bold text-neutral-950 sm:text-3xl">
          ဝါကျနှင့် စာပိုဒ် သတ်ပုံစစ်ဆေးရန်
        </h1>
        <p className="mm-text mt-2 text-sm text-neutral-600 sm:text-base">
          မြန်မာစာကြောင်း သို့မဟုတ် စာပိုဒ်ကို ရိုက်ထည့်ပါက မှားယွင်းနေသော စာလုံးပေါင်းများကိုသာ
          သတ်ပုံကျမ်းနှင့် တိုက်ဆိုင်စစ်ဆေးပြီး အမှန်ဖြင့် တစ်ချက်နှိပ် အစားထိုးပေးပါသည်။
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Input Editor */}
        <section className="lg:col-span-6">
          <div className="flex items-center justify-between pb-2">
            <label
              htmlFor="phrase-checker-textarea"
              className="mm-text text-sm font-semibold text-neutral-900"
            >
              စစ်ဆေးလိုသော စာသား
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onTextChange(SAMPLE_PARAGRAPH);
                  setSelectedIndex(null);
                  setValidationNotice("");
                }}
                className="mm-text inline-flex items-center gap-1 text-xs font-medium text-blue-900 hover:underline"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>နမူနာစာပိုဒ် စမ်းသပ်ရန်</span>
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id="phrase-checker-textarea"
            rows={6}
            value={text}
            onChange={(e) => {
              onTextChange(e.target.value);
              setSelectedIndex(null);
              if (validationNotice) setValidationNotice("");
            }}
            placeholder="စစ်ဆေးလိုသော မြန်မာစာပိုဒ်ကို ရိုက်ထည့်ပါ..."
            className="mm-text w-full rounded-xl border border-neutral-300 bg-white p-4 text-base text-neutral-950 placeholder:text-neutral-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/15"
          />

          {validationNotice && (
            <p className="mm-text mt-2 text-xs font-medium text-rose-700">
              {validationNotice}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleApplyAllCorrections}
              disabled={flaggedCount === 0 && text.trim().length > 0}
              className="mm-text inline-flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>အမှန်အားလုံး အစားထိုးရန် ({flaggedCount})</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              disabled={!text.trim()}
              className="mm-text inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
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
                  <span>စာသားကူးယူရန်</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClearText}
              disabled={text.length === 0}
              className="mm-text inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-rose-800 hover:border-rose-300 hover:bg-rose-50/70 disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>စာသားဖျက်ရန်</span>
            </button>
          </div>
        </section>

        {/* Right: Annotated Output & Interactive Word Replacer */}
        <section className="lg:col-span-6">
          <div className="flex items-baseline justify-between pb-2">
            <h2 className="mm-text text-sm font-semibold text-neutral-900">
              စစ်ဆေးတွေ့ရှိချက်
            </h2>
            <span className="mm-text text-xs text-neutral-500">
              ပြင်ဆင်ရန် အကြံပြုချက်{" "}
              <span className="num-tabular font-semibold text-neutral-900">
                {flaggedCount}
              </span>{" "}
              နေရာ
            </span>
          </div>

          <div className="min-h-[176px] rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
            {tokens.length === 0 ? (
              <p className="mm-text text-sm text-neutral-400">
                လက်ဝဲဘက်အကွက်တွင် စာရိုက်ထည့်လိုက်သည်နှင့် သတ်ပုံစစ်ဆေးချက် ပေါ်လာပါမည်။
              </p>
            ) : (
              <div className="mm-text whitespace-pre-wrap leading-loose text-base text-neutral-900">
                {tokens.map((tok, idx) => {
                  if (tok.status === "punctuation" || tok.status === "exact") {
                    return <span key={idx}>{tok.raw}</span>;
                  }
                  const isSel = selectedIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`rounded px-1 font-semibold underline decoration-2 underline-offset-6 transition-colors ${
                        tok.status === "correction"
                          ? "decoration-rose-700 text-rose-900 bg-rose-50 hover:bg-rose-100"
                          : "decoration-blue-800 text-blue-950 bg-blue-50/80 hover:bg-blue-100/80"
                      } ${isSel ? "ring-2 ring-blue-900" : ""}`}
                    >
                      {tok.raw}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* All-Correct Confirmation Banner */}
          {hasMyanmarInput && flaggedCount === 0 && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3.5">
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              <p className="mm-text text-sm font-medium text-neutral-800">
                စာလုံးပေါင်းအမှား မတွေ့ရှိပါ — ရေးသားထားသော သတ်ပုံများ မှန်ကန်ပါသည်။
              </p>
            </div>
          )}

          {/* Selected Flagged Word Details */}
          {activeToken &&
            (activeToken.status === "correction" ||
              activeToken.status === "suggestion") && (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="mm-text text-sm font-bold text-neutral-950">
                    ရွေးချယ်ထားသောပုဒ် — “{activeToken.raw}”
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectWord(activeToken.cleanWord)}
                    className="mm-text text-xs font-semibold text-blue-900 hover:underline"
                  >
                    အသေးစိတ်ရှာဖွေရန် →
                  </button>
                </div>

                {activeToken.reason && (
                  <p className="mm-text mt-1.5 text-xs text-neutral-600">
                    {activeToken.reason}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="mm-text text-xs text-neutral-500">
                    အမှန်ဖြင့် အစားထိုးရန် —
                  </span>
                  {activeToken.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        selectedIndex !== null &&
                        handleReplaceToken(selectedIndex, sug)
                      }
                      className="mm-text rounded-md border border-blue-900 bg-blue-950 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-900"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Flagged Replacement List */}
          {!activeToken && flaggedCount > 0 && (
            <div className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white px-4">
              {tokens.map((tok, idx) => {
                if (
                  tok.status !== "correction" &&
                  tok.status !== "suggestion"
                ) {
                  return null;
                }
                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="mm-text text-sm">
                      <span className="text-rose-800 line-through">
                        {tok.raw}
                      </span>
                      <span className="mx-2 text-neutral-400">→</span>
                      <span className="font-bold text-neutral-950">
                        {tok.suggestions[0]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        tok.suggestions[0] &&
                        handleReplaceToken(idx, tok.suggestions[0])
                      }
                      className="mm-text rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      အစားထိုးရန်
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
