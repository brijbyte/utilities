import { HashTable } from "./HashTable";
import { FileItem } from "./FileItem";
import type { Algorithm } from "./types";

interface FileInfo {
  id: string;
  file: File;
  path: string;
}

interface FileResultsProps {
  files: FileInfo[];
  textHashes: Record<Algorithm, string> | null;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}

export function FileResults({
  files,
  textHashes,
  copied,
  onCopy,
}: FileResultsProps) {
  if (textHashes) {
    return (
      <div className="overflow-auto px-pn-x py-pn-y">
        <HashTable
          hashes={textHashes}
          keyPrefix="text"
          copied={copied}
          onCopy={onCopy}
        />
      </div>
    );
  }

  if (files.length > 0) {
    return (
      <div className="overflow-auto">
        {files.map((entry) => (
          <FileItem key={entry.id} file={entry.file} path={entry.path} />
        ))}
      </div>
    );
  }

  return (
    <p className="text-xs text-text-muted px-pn-x py-pn-y">
      hashes will appear here...
    </p>
  );
}
