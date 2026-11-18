export interface SearchHistoryRecord {
  query: string;
  resolvedCorrect?: string;
  wasExact: boolean;
  timestamp: number;
}

export interface SavedBookmarkRecord {
  headword: string;
  isVerb?: boolean;
  note?: string;
  rhyme: string;
  bookPage: number;
  savedAt: number;
}

const HISTORY_KEY = "mm_orthography_history_v1";
const BOOKMARKS_KEY = "mm_orthography_bookmarks_v1";
const CHECKER_DRAFT_KEY = "mm_orthography_checker_draft_v1";
const MAX_HISTORY_ITEMS = 50;

export function loadCheckerDraft(): string {
  try {
    return window.localStorage.getItem(CHECKER_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCheckerDraft(text: string): void {
  try {
    if (!text) {
      window.localStorage.removeItem(CHECKER_DRAFT_KEY);
    } else {
      window.localStorage.setItem(CHECKER_DRAFT_KEY, text);
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearCheckerDraft(): void {
  try {
    window.localStorage.removeItem(CHECKER_DRAFT_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function loadSearchHistory(): SearchHistoryRecord[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSearchHistoryItem(
  item: Omit<SearchHistoryRecord, "timestamp">
): SearchHistoryRecord[] {
  const q = item.query.trim();
  if (!q) return loadSearchHistory();

  const existing = loadSearchHistory().filter((r) => r.query !== q);
  const updated: SearchHistoryRecord[] = [
    {
      ...item,
      query: q,
      timestamp: Date.now(),
    },
    ...existing,
  ].slice(0, MAX_HISTORY_ITEMS);

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return updated;
}

export function removeSearchHistoryItem(query: string): SearchHistoryRecord[] {
  const updated = loadSearchHistory().filter((r) => r.query !== query);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return updated;
}

export function clearSearchHistory(): SearchHistoryRecord[] {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
  return [];
}

export function loadSavedBookmarks(): SavedBookmarkRecord[] {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleSavedBookmark(
  record: Omit<SavedBookmarkRecord, "savedAt">
): { bookmarks: SavedBookmarkRecord[]; isSaved: boolean } {
  const current = loadSavedBookmarks();
  const exists = current.some(
    (b) => b.headword === record.headword && b.bookPage === record.bookPage
  );

  let updated: SavedBookmarkRecord[];
  if (exists) {
    updated = current.filter(
      (b) => !(b.headword === record.headword && b.bookPage === record.bookPage)
    );
  } else {
    updated = [{ ...record, savedAt: Date.now() }, ...current];
  }

  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return { bookmarks: updated, isSaved: !exists };
}

export function clearSavedBookmarks(): SavedBookmarkRecord[] {
  try {
    window.localStorage.removeItem(BOOKMARKS_KEY);
  } catch {
    // Ignore storage errors
  }
  return [];
}
