/**
 * Merge two sets of TOTP accounts, deduplicating by (issuer + label + secret).
 * When duplicates exist, the `primary` version wins.
 */

import type { TotpAccount } from "./db";

function accountKey(a: TotpAccount): string {
  return `${a.issuer}\0${a.label}\0${a.secret}`;
}

/**
 * Merge primary and secondary account lists.
 * Primary accounts take precedence for duplicates.
 * Unique secondary accounts are appended.
 */
export function mergeAccounts(
  primary: TotpAccount[],
  secondary: TotpAccount[],
): TotpAccount[] {
  const seen = new Set<string>();
  const result: TotpAccount[] = [];

  for (const acc of primary) {
    seen.add(accountKey(acc));
    result.push(acc);
  }

  for (const acc of secondary) {
    if (!seen.has(accountKey(acc))) {
      seen.add(accountKey(acc));
      result.push(acc);
    }
  }

  return result;
}
