import { useEffect, useMemo, useRef, useState } from "react";
import { orthographyDataset } from "./data/orthographyLoader";
import {
  ExpandedEntry,
  searchOrthography,
  SmartSearchOutcome,
} from "./utils/orthographySearch";
import {
  clearCheckerDraft,
  clearSavedBookmarks,
  clearSearchHistory,
  loadCheckerDraft,
  loadSavedBookmarks,
  loadSearchHistory,
  removeSearchHistoryItem,
  saveCheckerDraft,
  SavedBookmarkRecord,
  saveSearchHistoryItem,
  SearchHistoryRecord,
  toggleSavedBookmark,
} from "./utils/storage";
import { ActiveTab, Header } from "./components/Header";
import { SmartSearchView } from "./components/SmartSearchView";
import { PhraseCheckerView } from "./components/PhraseCheckerView";
import { DistinctionsView } from "./components/DistinctionsView";
import { IndexAndRulesView } from "./components/IndexAndRulesView";
import { HistoryDrawer } from "./components/HistoryDrawer";

function getInitialQueryFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  } catch {
    return "";
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("search");
  const [query, setQuery] = useState<string>(() => getInitialQueryFromUrl());
  const [checkerText, setCheckerText] = useState<string>(() =>
    loadCheckerDraft()
  );
  const [distinctionsInitialFilter, setDistinctionsInitialFilter] =
    useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const [history, setHistory] = useState<SearchHistoryRecord[]>(() =>
    loadSearchHistory()
  );
  const [bookmarks, setBookmarks] = useState<SavedBookmarkRecord[]>(() =>
    loadSavedBookmarks()
  );

  const outcome = useMemo(() => searchOrthography(query, 40), [query]);

  // Sync active search query to URL ?q= parameter for shareable links
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const trimmed = query.trim();
      if (trimmed) {
        url.searchParams.set("q", trimmed);
      } else {
        url.searchParams.delete("q");
      }
      if (url.search !== window.location.search) {
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    } catch {
      // Ignore history API restrictions inside sandboxed frames
    }
  }, [query]);

  // Support browser Back/Forward navigation for ?q=
  useEffect(() => {
    const handlePopState = () => {
      const urlQ = getInitialQueryFromUrl();
      setQuery(urlQ);
      if (urlQ) {
        setActiveTab("search");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Global "/" shortcut to jump directly to the search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setActiveTab("search");
      window.requestAnimationFrame(() => {
        const input = document.getElementById(
          "orthography-search-input"
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-save meaningful searches into localStorage after a short pause
  const debounceTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    const cleanQ = outcome.normalizedQuery;
    if (cleanQ.length < 2) return;

    debounceTimerRef.current = window.setTimeout(() => {
      const resolvedCorrect =
        outcome.primaryCorrection?.correctWords[0] ??
        (outcome.hasExactMatch ? cleanQ : outcome.results[0]?.entry.w);
      setHistory(
        saveSearchHistoryItem({
          query: cleanQ,
          resolvedCorrect,
          wasExact: outcome.hasExactMatch,
        })
      );
    }, 650);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [outcome]);

  const handleCheckerTextChange = (nextText: string) => {
    setCheckerText(nextText);
    saveCheckerDraft(nextText);
  };

  const handleClearCheckerDraft = () => {
    setCheckerText("");
    clearCheckerDraft();
  };

  const handleCommitSearch = (rawQ: string, curOutcome: SmartSearchOutcome) => {
    const cleanQ = curOutcome.normalizedQuery || rawQ.trim();
    if (!cleanQ) return;
    const resolvedCorrect =
      curOutcome.primaryCorrection?.correctWords[0] ??
      (curOutcome.hasExactMatch ? cleanQ : curOutcome.results[0]?.entry.w);
    setHistory(
      saveSearchHistoryItem({
        query: cleanQ,
        resolvedCorrect,
        wasExact: curOutcome.hasExactMatch,
      })
    );
  };

  const handleToggleBookmark = (entry: ExpandedEntry) => {
    const res = toggleSavedBookmark({
      headword: entry.w,
      isVerb: Boolean(entry.v),
      note: entry.n,
      rhyme: entry.r,
      bookPage: entry.p,
    });
    setBookmarks(res.bookmarks);
  };

  const handleRemoveBookmark = (headword: string, bookPage: number) => {
    const res = toggleSavedBookmark({
      headword,
      rhyme: "",
      bookPage,
    });
    setBookmarks(res.bookmarks);
  };

  const handleSelectWordForSearch = (word: string) => {
    setQuery(word);
    setActiveTab("search");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateDistinctions = (filterStr = "") => {
    setDistinctionsInitialFilter(filterStr);
    setActiveTab("distinctions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-white text-neutral-950">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={bookmarks.length}
        historyCount={history.length}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      <main className="flex-1">
        {activeTab === "search" && (
          <SmartSearchView
            query={query}
            onQueryChange={setQuery}
            onCommitSearch={handleCommitSearch}
            outcome={outcome}
            history={history}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onRemoveHistoryItem={(q) => setHistory(removeSearchHistoryItem(q))}
            onClearHistory={() => setHistory(clearSearchHistory())}
            onNavigateDistinctions={handleNavigateDistinctions}
          />
        )}

        {activeTab === "checker" && (
          <PhraseCheckerView
            text={checkerText}
            onTextChange={handleCheckerTextChange}
            onClearDraft={handleClearCheckerDraft}
            onInspectWord={handleSelectWordForSearch}
          />
        )}

        {activeTab === "distinctions" && (
          <DistinctionsView
            key={distinctionsInitialFilter}
            initialFilter={distinctionsInitialFilter}
          />
        )}

        {activeTab === "reference" && (
          <IndexAndRulesView
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onSelectSearchWord={handleSelectWordForSearch}
          />
        )}
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-neutral-500 sm:flex-row sm:px-6">
          <p className="mm-text text-center sm:text-left">
            {orthographyDataset.meta.publisher} · {orthographyDataset.meta.title} (
            {orthographyDataset.meta.edition})
          </p>
          <div className="mm-text flex flex-wrap items-center justify-center gap-2.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="hover:text-neutral-900 transition-colors"
            >
              ရှာဖွေမှတ်တမ်း ({history.length})
            </button>
            <span aria-hidden="true" className="text-neutral-300">
              ·
            </span>
            <span>
              Web App created by{" "}
              <a
                href="https://www.facebook.com/dr.tashido/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-neutral-800 hover:text-blue-900 hover:underline transition-colors"
              >
                Tashido
              </a>
            </span>
          </div>
        </div>
      </footer>

      <HistoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        history={history}
        bookmarks={bookmarks}
        onSelectQuery={handleSelectWordForSearch}
        onRemoveHistoryItem={(q) => setHistory(removeSearchHistoryItem(q))}
        onClearHistory={() => setHistory(clearSearchHistory())}
        onRemoveBookmark={handleRemoveBookmark}
        onClearBookmarks={() => setBookmarks(clearSavedBookmarks())}
      />
    </div>
  );
}
