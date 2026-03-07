import { useState, useEffect, useRef } from "react";
import { Trash2, Copy, Check, ShieldCheck } from "lucide-react";
import { Popover } from "../../components/Popover";
import { Button } from "../../components/Button";
import type { TotpAccount } from "./db";
import { generateTotp } from "./totp";

interface AccountItemProps {
  account: TotpAccount;
  onDelete: (id: string) => void;
}

export function AccountItem({ account, onDelete }: AccountItemProps) {
  const [code, setCode] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      const now = Date.now();
      try {
        const newCode = await generateTotp(
          account.secret,
          account.algorithm,
          account.digits,
          account.period,
          now,
        );
        if (mounted) setCode(newCode);
      } catch {
        if (mounted) setCode("Error");
      }

      const seconds = new Date().getSeconds();
      if (mounted) {
        // Calculate progress based on the specific period of the account
        setProgress(100 - ((seconds % account.period) / account.period) * 100);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [account.period, account.secret, account.algorithm, account.digits]);

  function handleCopy() {
    if (!code || code === "Error") return;
    navigator.clipboard.writeText(code);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(true);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  // Simple heuristic for domain to fetch icon
  const domain = account.issuer
    ? `${account.issuer.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
    : null;

  return (
    <div
      className="bg-bg-surface border border-border p-md rounded-xl flex items-center gap-md relative overflow-hidden group cursor-pointer hover:border-border-muted transition-colors"
      onClick={handleCopy}
    >
      <div
        className="absolute top-0 left-0 h-1 bg-accent transition-all duration-1000 linear"
        style={{ width: `${progress}%` }}
      />

      <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center overflow-hidden shrink-0">
        {domain ? (
          <img
            src={`https://icon.horse/icon/${domain}`}
            alt={account.issuer}
            className="w-6 h-6 object-contain"
          />
        ) : (
          <ShieldCheck className="text-text-muted" size={20} />
        )}
      </div>

      <div className="flex-1 min-w-0 pt-xs">
        <div className="text-sm text-text-muted truncate">
          {account.issuer || "Unknown Issuer"}
        </div>
        <div className="text-xs text-text-muted truncate mb-sm">
          {account.label}
        </div>
        <div className="flex items-center gap-md">
          <div className="text-2xl font-mono text-text tracking-widest">
            {code || "..."}
          </div>
          {code && code !== "Error" && (
            <button
              type="button"
              onClick={handleCopy}
              className={`p-1 rounded transition-colors ${
                copied
                  ? "bg-success/20 text-success"
                  : "text-text-muted hover:bg-bg-hover hover:text-text cursor-pointer"
              }`}
              title="Copy code"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
        </div>
      </div>

      <Popover.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Popover.Trigger
          className={`${confirmOpen ? "opacity-100" : "sm:opacity-0 sm:group-hover:opacity-100"} text-danger shrink-0 transition-opacity inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs leading-none border border-transparent bg-transparent hover:bg-bg-hover cursor-pointer`}
          onClick={(e) => e.stopPropagation()}
          title="Delete account"
        >
          <Trash2 size={16} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end">
            <Popover.Popup className="rounded-lg p-md text-xs w-64">
              <Popover.Arrow />
              <p className="text-text font-medium mb-sm">
                Delete this account?
              </p>
              <p className="text-text-muted mb-md leading-relaxed">
                If two-factor authentication is still enabled on{" "}
                <span className="text-text">
                  {account.issuer || "this service"}
                </span>
                , you may lose access to your account. Disable 2FA or switch to
                another method on the website before deleting.
              </p>
              <div className="flex justify-end gap-sm">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(false);
                    onDelete(account.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
