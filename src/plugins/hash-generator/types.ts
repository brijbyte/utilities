export const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type Algorithm = (typeof ALGORITHMS)[number];
export type Hashes = Partial<Record<Algorithm, string>>;

export interface FileEntry {
  id: string;
  name: string;
  size: number;
  phase: "reading" | "hashing" | "done" | "error";
  readProgress: number;
  hashes: Hashes;
}

export interface FileWithPath {
  file: File;
  path: string;
}
