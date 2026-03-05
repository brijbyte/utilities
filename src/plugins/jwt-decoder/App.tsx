import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronRight } from "lucide-react";
import { Button } from "../../components/Button";
import { decodeJwt } from "./process";
import type { DecodedJwt } from "./process";

interface TimeClaim {
  label: string;
  key: string;
}

const TIME_CLAIMS: TimeClaim[] = [
  { label: "Issued At", key: "iat" },
  { label: "Expires", key: "exp" },
  { label: "Not Before", key: "nbf" },
];

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function getExpStatus(payload: Record<string, unknown>): {
  label: string;
  className: string;
} | null {
  const exp = payload.exp;
  if (typeof exp !== "number") return null;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) {
    const ago = now - exp;
    const unit =
      ago < 60
        ? `${ago}s`
        : ago < 3600
          ? `${Math.floor(ago / 60)}m`
          : ago < 86400
            ? `${Math.floor(ago / 3600)}h`
            : `${Math.floor(ago / 86400)}d`;
    return { label: `expired ${unit} ago`, className: "text-danger" };
  }
  const left = exp - now;
  const unit =
    left < 60
      ? `${left}s`
      : left < 3600
        ? `${Math.floor(left / 60)}m`
        : left < 86400
          ? `${Math.floor(left / 3600)}h`
          : `${Math.floor(left / 86400)}d`;
  return { label: `valid — expires in ${unit}`, className: "text-accent" };
}

interface DecodedEntry {
  line: number;
  raw: string;
  decoded: DecodedJwt | null;
  error: string | null;
}

function Section({
  title,
  children,
  extra,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-muted last:border-b-0">
      <div className="flex items-center gap-sm px-pn-x py-xs bg-bg-inset border-b border-border-muted">
        <span className="text-[10px] uppercase tracking-widest text-text-muted flex-1">
          {title}
        </span>
        {extra}
      </div>
      <div className="px-pn-x py-pn-y">{children}</div>
    </div>
  );
}

function ClaimsTable({ payload }: { payload: Record<string, unknown> }) {
  const timeClaims = TIME_CLAIMS.filter(
    (tc) => typeof payload[tc.key] === "number",
  );

  const knownKeys = new Set([
    ...TIME_CLAIMS.map((tc) => tc.key),
    "sub",
    "iss",
    "aud",
    "jti",
  ]);
  const standardClaims = [
    { label: "Subject", key: "sub" },
    { label: "Issuer", key: "iss" },
    { label: "Audience", key: "aud" },
    { label: "JWT ID", key: "jti" },
  ].filter((c) => payload[c.key] !== undefined);

  const customKeys = Object.keys(payload).filter((k) => !knownKeys.has(k));

  if (
    timeClaims.length === 0 &&
    standardClaims.length === 0 &&
    customKeys.length === 0
  ) {
    return null;
  }

  return (
    <table className="w-full text-xs">
      <tbody>
        {standardClaims.map((c) => (
          <tr
            key={c.key}
            className="border-b border-border-muted last:border-b-0"
          >
            <td className="py-xs pr-md text-text-muted whitespace-nowrap align-top">
              {c.label}
            </td>
            <td className="py-xs text-text break-all font-mono">
              {String(payload[c.key])}
            </td>
          </tr>
        ))}
        {timeClaims.map((tc) => (
          <tr
            key={tc.key}
            className="border-b border-border-muted last:border-b-0"
          >
            <td className="py-xs pr-md text-text-muted whitespace-nowrap align-top">
              {tc.label}
            </td>
            <td className="py-xs text-text font-mono">
              {formatTimestamp(payload[tc.key] as number)}
              <span className="text-text-muted ml-sm">
                ({payload[tc.key] as number})
              </span>
            </td>
          </tr>
        ))}
        {customKeys.map((key) => (
          <tr
            key={key}
            className="border-b border-border-muted last:border-b-0"
          >
            <td className="py-xs pr-md text-text-muted whitespace-nowrap align-top font-mono">
              {key}
            </td>
            <td className="py-xs text-text break-all font-mono">
              {typeof payload[key] === "object"
                ? JSON.stringify(payload[key])
                : String(payload[key])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TokenBody({ decoded }: { decoded: DecodedJwt }) {
  function copySection(data: Record<string, unknown>) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }

  return (
    <>
      <Section
        title="header"
        extra={
          <button
            type="button"
            onClick={() => copySection(decoded.header)}
            className="text-[10px] text-accent cursor-pointer bg-transparent border-none p-0 hover:underline"
          >
            copy
          </button>
        }
      >
        <pre className="text-xs text-text font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(decoded.header, null, 2)}
        </pre>
      </Section>

      <Section
        title="payload"
        extra={
          <button
            type="button"
            onClick={() => copySection(decoded.payload)}
            className="text-[10px] text-accent cursor-pointer bg-transparent border-none p-0 hover:underline"
          >
            copy
          </button>
        }
      >
        <pre className="text-xs text-text font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(decoded.payload, null, 2)}
        </pre>
      </Section>

      <Section title="claims">
        <ClaimsTable payload={decoded.payload} />
      </Section>

      <Section title="signature">
        <p className="text-xs text-text font-mono break-all">
          {decoded.signature}
        </p>
        <p className="text-[10px] text-text-muted mt-sm">
          algorithm: {String(decoded.header.alg ?? "unknown")}
        </p>
      </Section>
    </>
  );
}

export default function JwtDecoder() {
  const [input, setInput] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const [autoFocus, setAutoFocus] = useState(true);
  const autoFocusRef = useRef(true);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const entries: DecodedEntry[] = useMemo(() => {
    const lines = input.split("\n");
    const results: DecodedEntry[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      try {
        results.push({
          line: i + 1,
          raw,
          decoded: decodeJwt(raw),
          error: null,
        });
      } catch (e) {
        results.push({
          line: i + 1,
          raw,
          decoded: null,
          error: (e as Error).message,
        });
      }
    }
    return results;
  }, [input]);

  // When entries change (new input), open all
  const prevEntryCount = useRef(0);
  useEffect(() => {
    if (entries.length !== prevEntryCount.current) {
      setOpenItems(entries.map((e) => String(e.line)));
      prevEntryCount.current = entries.length;
    }
  }, [entries]);

  // Get line number from cursor position in textarea
  const handleCursorChange = useCallback((el: HTMLTextAreaElement) => {
    const pos = el.selectionStart;
    const text = el.value;
    const lineNum = text.substring(0, pos).split("\n").length;

    // Find the entry that corresponds to this line
    // Parse entries from current textarea value (not stale state)
    const lines = text.split("\n");
    let matchedLine: number | null = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() && i + 1 === lineNum) {
        matchedLine = i + 1;
        break;
      }
    }

    if (!matchedLine) {
      setFocusedLine(null);
      return;
    }

    const key = String(matchedLine);
    setFocusedLine(matchedLine);

    if (!autoFocusRef.current) return;

    // Ensure it's open
    setOpenItems((prev) => (prev.includes(key) ? prev : [...prev, key]));

    // Scroll into view after accordion opens
    requestAnimationFrame(() => {
      const itemEl = itemRefs.current.get(key);
      itemEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  function clear() {
    setInput("");
    setOpenItems([]);
    setFocusedLine(null);
  }

  const validCount = entries.filter((e) => e.decoded).length;
  const errorCount = entries.filter((e) => e.error).length;

  return (
    <div className="h-full flex flex-col">
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        {entries.length > 0 && (
          <span className="text-xs text-text-muted">
            {validCount} decoded
            {errorCount > 0 && (
              <span className="text-danger ml-sm">{errorCount} invalid</span>
            )}
          </span>
        )}

        <Toolbar.Group className="ml-auto flex items-center gap-tb">
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={clear}
                disabled={!input}
              >
                clear
              </Button>
            )}
          />
        </Toolbar.Group>
      </Toolbar.Root>

      <div className="flex-1 flex min-h-0">
        {/* Left: input */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="flex items-center gap-sm px-pn-x py-pn-lbl bg-bg-surface border-b border-border-muted min-h-[32px]">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              tokens — one per line
            </span>
            <label className="ml-auto flex items-center gap-xs text-[10px] text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoFocus}
                onChange={(e) => {
                  setAutoFocus(e.target.checked);
                  autoFocusRef.current = e.target.checked;
                }}
                className="accent-accent"
              />
              sync cursor
            </label>
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const target = e.target;
              requestAnimationFrame(() => handleCursorChange(target));
            }}
            onKeyUp={(e) => handleCursorChange(e.currentTarget)}
            onClick={(e) => handleCursorChange(e.currentTarget)}
            placeholder="paste JWT tokens here, one per line..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-transparent text-text border-none outline-none font-mono leading-relaxed break-all"
          />
        </div>

        {/* Right: decoded */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          <div className="flex items-center px-pn-x py-pn-lbl bg-bg-surface border-b border-border-muted min-h-[32px]">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              decoded
            </span>
          </div>

          {entries.length > 0 ? (
            <Accordion.Root
              value={openItems}
              onValueChange={setOpenItems}
              multiple
              className="overflow-auto"
            >
              {entries.map((entry) => {
                const expStatus = entry.decoded
                  ? getExpStatus(entry.decoded.payload)
                  : null;
                const isFocused = focusedLine === entry.line;

                return (
                  <Accordion.Item
                    key={entry.line}
                    value={String(entry.line)}
                    className="border-b border-border last:border-b-0"
                    ref={(el: HTMLDivElement | null) => {
                      if (el) itemRefs.current.set(String(entry.line), el);
                      else itemRefs.current.delete(String(entry.line));
                    }}
                  >
                    <Accordion.Header>
                      <Accordion.Trigger
                        className={`flex items-center gap-sm px-pn-x py-pn-lbl w-full border-none cursor-pointer text-left group border-b border-border-muted ${
                          isFocused ? "bg-accent/10" : "bg-bg-surface"
                        }`}
                      >
                        <ChevronRight
                          size={10}
                          className="text-text-muted transition-transform duration-150 group-data-[panel-open]:rotate-90"
                        />
                        <span
                          className={`text-[10px] uppercase tracking-widest flex-1 ${
                            isFocused ? "text-accent" : "text-text-muted"
                          }`}
                        >
                          token #{entry.line}
                        </span>
                        {entry.error && (
                          <span className="text-[10px] text-danger">
                            invalid
                          </span>
                        )}
                        {expStatus && (
                          <span
                            className={`text-[10px] ${expStatus.className}`}
                          >
                            {expStatus.label}
                          </span>
                        )}
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Panel>
                      {entry.error ? (
                        <div className="px-pn-x py-pn-y text-xs text-danger">
                          ✕ {entry.error}
                        </div>
                      ) : entry.decoded ? (
                        <TokenBody decoded={entry.decoded} />
                      ) : null}
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          ) : (
            <p className="text-xs text-text-muted px-pn-x py-pn-y">
              decoded tokens will appear here...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
