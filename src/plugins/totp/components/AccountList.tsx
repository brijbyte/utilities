import { Plus } from "lucide-react";
import type { TotpAccount } from "../utils/db";
import { AccountItem } from "./AccountItem";

interface Props {
  accounts: TotpAccount[];
  onDelete: (id: string) => void;
}

export function AccountList({ accounts, onDelete }: Props) {
  if (accounts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-3">
        <Plus size={48} className="opacity-20" />
        <p>No accounts added yet.</p>
        <p className="text-sm">Scan a QR code or upload an image to begin.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
      {accounts.map((acc) => (
        <AccountItem key={acc.id} account={acc} onDelete={onDelete} />
      ))}
    </div>
  );
}
