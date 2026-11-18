import React from "react";
import { Bookmark } from "lucide-react";

export type ActiveTab = "search" | "checker" | "distinctions" | "reference";

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedCount: number;
  historyCount: number;
  onOpenDrawer: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: "search", label: "သတ်ပုံရှာရန်" },
  { id: "checker", label: "စာပိုဒ်စစ်ရန်" },
  { id: "distinctions", label: "ခွဲထားအညွှန်း" },
  { id: "reference", label: "အက္ခရာနှင့် မူများ" },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  savedCount,
  historyCount,
  onOpenDrawer,
}) => {
  const totalCount = savedCount + historyCount;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab("search");
          }}
          className="mm-display text-base font-bold tracking-tight text-neutral-950 hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900 sm:text-lg"
        >
          မြန်မာစာလုံးပေါင်းသတ်ပုံကျမ်း
        </a>

        <nav
          aria-label="ပင်မ လမ်းညွှန်"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`mm-text py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900 ${
                  isActive
                    ? "border-blue-900 text-neutral-950 font-semibold"
                    : "border-transparent text-neutral-600 hover:text-neutral-950 hover:border-neutral-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="mm-text inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 hover:border-neutral-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
          >
            <Bookmark className="h-3.5 w-3.5 text-blue-900" aria-hidden="true" />
            <span>မှတ်တမ်း</span>
            {totalCount > 0 && (
              <span className="num-tabular text-neutral-500">
                ({totalCount})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile horizontal nav bar (non-sticky so mobile sticky height stays 0%) */}
      <nav
        aria-label="မိုဘိုင်း လမ်းညွှန်"
        className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-2 bg-neutral-50/60"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`mm-text px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-white text-neutral-950 font-semibold shadow-xs border border-neutral-200"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
