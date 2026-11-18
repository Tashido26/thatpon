import rawData from "./orthographyData.json";

export interface RawDictEntry {
  w: string; // headword
  c: string; // consonant section (က..အ)
  r: string; // rhyme group (ကာရန်)
  p: number; // book page (1..285, pdfPage = p + 50)
  v?: number; // 1 if verb (-)
  n?: string; // parenthetical note with ~
}

export type DistinctionType = "misspelling" | "compare" | "dual" | "xref";

export interface DistinctionPair {
  id: number;
  c: string;
  t: DistinctionType;
  l: string;
  r: string;
  p: number; // book page (139..264)
  pdf: number; // exact PDF page (337..462)
}

export interface RhymeIndexItem {
  no: string;
  r: string;
  p: string;
  c: string;
}

export interface OrthographyDataset {
  meta: {
    title: string;
    publisher: string;
    edition: string;
    pdfUrl: string;
    entryCount: number;
    distinctionCount: number;
    rhymeCount: number;
  };
  entries: RawDictEntry[];
  distinctions: DistinctionPair[];
  rhymes: RhymeIndexItem[];
}

export const orthographyDataset = rawData as OrthographyDataset;
