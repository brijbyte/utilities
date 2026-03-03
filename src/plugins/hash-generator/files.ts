import type { FileWithPath } from "./types";

function readEntriesPromise(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

export async function collectFiles(
  entry: FileSystemEntry,
  basePath: string,
): Promise<FileWithPath[]> {
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    return [{ file, path: basePath + entry.name }];
  }
  if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const results: FileWithPath[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await readEntriesPromise(dirReader);
      for (const child of batch) {
        results.push(
          ...(await collectFiles(child, basePath + entry.name + "/")),
        );
      }
    } while (batch.length > 0);
    return results;
  }
  return [];
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
