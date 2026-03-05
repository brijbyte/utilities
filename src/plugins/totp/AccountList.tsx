import { Plus } from "lucide-react";
import type { TotpAccount } from "./db";
import { AccountItem } from "./AccountItem";
import { TotpGridSkeleton } from "./Skeleton";

interface Props {
  accounts: TotpAccount[];
  syncState: "initial" | "syncing" | "idle";
  onDelete: (id: string) => void;
}

export function AccountList({ accounts, syncState, onDelete }: Props) {
  if (syncState === "initial") return <TotpGridSkeleton />;

  if (accounts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-md">
        <Plus size={48} className="opacity-20" />
        <p>No accounts added yet.</p>
        <p className="text-sm">Scan a QR code or upload an image to begin.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-md grid-cols-1 md:grid-cols-2">
      {accounts.map((acc) => (
        <AccountItem key={acc.id} account={acc} onDelete={onDelete} />
      ))}
    </div>
  );
}
