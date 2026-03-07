/**
 * Google Drive sync — encrypted blob storage in appDataFolder.
 *
 * The vault blob is always encrypted (same password-derived key).
 * This module uploads/downloads the EncryptedBlob JSON to Drive.
 */

import type { EncryptedBlob } from "./crypto";

const DRIVE_FILE_NAME = "totp-vault.json";
const DRIVE_API = "https://www.googleapis.com/";

/** Find the vault file in appDataFolder. */
async function findFile(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${DRIVE_FILE_NAME}'`,
    fields: "files(id)",
  });
  const res = await fetch(`${DRIVE_API}drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/** Download the encrypted blob from Drive. Returns null if not found. */
export async function downloadBlob(
  token: string,
): Promise<EncryptedBlob | null> {
  const fileId = await findFile(token);
  if (!fileId) return null;

  const res = await fetch(`${DRIVE_API}drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  const blob: EncryptedBlob = await res.json();

  // Basic validation
  if (!blob.version || !blob.salt || !blob.verifier) return null;
  return blob;
}

/** Upload the encrypted blob to Drive (create or update). */
export async function uploadBlob(
  token: string,
  blob: EncryptedBlob,
): Promise<void> {
  const fileId = await findFile(token);
  const body = JSON.stringify(blob);

  if (fileId) {
    const res = await fetch(
      `${DRIVE_API}upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      },
    );
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
  } else {
    const metadata = {
      name: DRIVE_FILE_NAME,
      parents: ["appDataFolder"],
    };
    const boundary = "totp_vault_boundary";
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;

    const res = await fetch(
      `${DRIVE_API}upload/drive/v3/files?uploadType=multipart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
      },
    );
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  }
}

/** Delete the vault file from Drive. */
export async function deleteBlob(token: string): Promise<void> {
  const fileId = await findFile(token);
  if (fileId) {
    await fetch(`${DRIVE_API}drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
