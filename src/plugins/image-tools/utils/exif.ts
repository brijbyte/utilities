/**
 * Minimal EXIF parser — extracts common metadata from JPEG/TIFF files.
 * Pure JS, no dependencies. Reads the first 128KB of the file.
 *
 * Only handles JPEG APP1 (Exif) marker. Returns null for non-JPEG or
 * files without EXIF data (PNG, WebP, etc.).
 */

export interface ExifData {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  exposureTime?: string; // e.g. "1/250"
  fNumber?: string; // e.g. "f/2.8"
  iso?: number;
  focalLength?: string; // e.g. "50mm"
  flash?: string;
  orientation?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  colorSpace?: string;
  whiteBalance?: string;
  meteringMode?: string;
  exposureProgram?: string;
  lensModel?: string;
  imageDescription?: string;
  copyright?: string;
  artist?: string;
}

// ── EXIF tag IDs ────────────────────────────────────────────

const TAGS: Record<number, keyof ExifData> = {
  0x010f: "make",
  0x0110: "model",
  0x0131: "software",
  0x0132: "dateTime",
  0x9003: "dateTimeOriginal",
  0x829a: "exposureTime",
  0x829d: "fNumber",
  0x8827: "iso",
  0x920a: "focalLength",
  0x9209: "flash",
  0x0112: "orientation",
  0xa001: "colorSpace",
  0xa405: "focalLength", // FocalLengthIn35mmFilm
  0x9207: "meteringMode",
  0x8822: "exposureProgram",
  0xa434: "lensModel",
  0x010e: "imageDescription",
  0x8298: "copyright",
  0x013b: "artist",
  0xa402: "whiteBalance",
};

const FLASH_LABELS: Record<number, string> = {
  0x00: "No Flash",
  0x01: "Fired",
  0x05: "Fired, Return not detected",
  0x07: "Fired, Return detected",
  0x08: "On, Did not fire",
  0x09: "On, Fired",
  0x0d: "On, Return not detected",
  0x0f: "On, Return detected",
  0x10: "Off, Did not fire",
  0x18: "Auto, Did not fire",
  0x19: "Auto, Fired",
  0x1d: "Auto, Fired, Return not detected",
  0x1f: "Auto, Fired, Return detected",
  0x20: "No flash function",
  0x41: "Fired, Red-eye reduction",
  0x45: "Fired, Red-eye, Return not detected",
  0x47: "Fired, Red-eye, Return detected",
  0x49: "On, Red-eye",
  0x4d: "On, Red-eye, Return not detected",
  0x4f: "On, Red-eye, Return detected",
  0x59: "Auto, Fired, Red-eye",
  0x5d: "Auto, Fired, Red-eye, Return not detected",
  0x5f: "Auto, Fired, Red-eye, Return detected",
};

const METERING_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Average",
  2: "Center-weighted",
  3: "Spot",
  4: "Multi-spot",
  5: "Multi-segment",
  6: "Partial",
};

const EXPOSURE_PROGRAM_LABELS: Record<number, string> = {
  0: "Not defined",
  1: "Manual",
  2: "Normal program",
  3: "Aperture priority",
  4: "Shutter priority",
  5: "Creative",
  6: "Action",
  7: "Portrait",
  8: "Landscape",
};

const COLOR_SPACE_LABELS: Record<number, string> = {
  1: "sRGB",
  0xffff: "Uncalibrated",
};

// ── Parser ──────────────────────────────────────────────────

function getString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    str += String.fromCharCode(c);
  }
  return str.trim();
}

function readRational(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number {
  const num = view.getUint32(offset, littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  return den === 0 ? 0 : num / den;
}

function readIFD(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ExifData,
): void {
  const entries = view.getUint16(tiffStart + ifdOffset, littleEndian);

  for (let i = 0; i < entries; i++) {
    const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    // Sub-IFD pointer (Exif IFD)
    if (tag === 0x8769) {
      const subIfdOffset = view.getUint32(valueOffset, littleEndian);
      readIFD(view, tiffStart, subIfdOffset, littleEndian, result);
      continue;
    }

    // GPS IFD pointer
    if (tag === 0x8825) {
      const gpsIfdOffset = view.getUint32(valueOffset, littleEndian);
      readGPSIFD(view, tiffStart, gpsIfdOffset, littleEndian, result);
      continue;
    }

    const key = TAGS[tag];
    if (!key) continue;

    // Read value based on type
    if (type === 2) {
      // ASCII string
      const strLen = count;
      const strOffset =
        strLen > 4
          ? tiffStart + view.getUint32(valueOffset, littleEndian)
          : valueOffset;
      if (strOffset + strLen <= view.byteLength) {
        (result as Record<string, unknown>)[key] = getString(
          view,
          strOffset,
          strLen,
        );
      }
    } else if (type === 3) {
      // SHORT (uint16)
      const val = view.getUint16(valueOffset, littleEndian);
      if (key === "flash") {
        result.flash = FLASH_LABELS[val] ?? `Flash: ${val}`;
      } else if (key === "colorSpace") {
        result.colorSpace = COLOR_SPACE_LABELS[val] ?? `${val}`;
      } else if (key === "meteringMode") {
        result.meteringMode = METERING_LABELS[val] ?? `${val}`;
      } else if (key === "exposureProgram") {
        result.exposureProgram = EXPOSURE_PROGRAM_LABELS[val] ?? `${val}`;
      } else if (key === "whiteBalance") {
        result.whiteBalance = val === 0 ? "Auto" : "Manual";
      } else if (key === "iso") {
        result.iso = val;
      } else if (key === "orientation") {
        result.orientation = val;
      } else {
        (result as Record<string, unknown>)[key] = val;
      }
    } else if (type === 4) {
      // LONG (uint32)
      const val = view.getUint32(valueOffset, littleEndian);
      if (key === "iso") result.iso = val;
    } else if (type === 5) {
      // RATIONAL (uint32/uint32)
      const ratOffset = tiffStart + view.getUint32(valueOffset, littleEndian);
      if (ratOffset + 8 <= view.byteLength) {
        const val = readRational(view, ratOffset, littleEndian);
        if (key === "exposureTime") {
          result.exposureTime =
            val < 1
              ? `1/${Math.round(1 / val)}`
              : `${Math.round(val * 10) / 10}`;
        } else if (key === "fNumber") {
          result.fNumber = `f/${Math.round(val * 10) / 10}`;
        } else if (key === "focalLength") {
          result.focalLength = `${Math.round(val)}mm`;
        }
      }
    }
  }
}

function readGPSIFD(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ExifData,
): void {
  const entries = view.getUint16(tiffStart + ifdOffset, littleEndian);
  let latRef = "N";
  let lonRef = "E";
  let lat = 0;
  let lon = 0;
  let hasLat = false;
  let hasLon = false;

  for (let i = 0; i < entries; i++) {
    const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const valueOffset = entryOffset + 8;

    if (tag === 1 && type === 2) {
      // GPSLatitudeRef
      latRef = String.fromCharCode(view.getUint8(valueOffset));
    } else if (tag === 3 && type === 2) {
      // GPSLongitudeRef
      lonRef = String.fromCharCode(view.getUint8(valueOffset));
    } else if (tag === 2 && type === 5) {
      // GPSLatitude (3 rationals: degrees, minutes, seconds)
      const off = tiffStart + view.getUint32(valueOffset, littleEndian);
      if (off + 24 <= view.byteLength) {
        const d = readRational(view, off, littleEndian);
        const m = readRational(view, off + 8, littleEndian);
        const s = readRational(view, off + 16, littleEndian);
        lat = d + m / 60 + s / 3600;
        hasLat = true;
      }
    } else if (tag === 4 && type === 5) {
      // GPSLongitude
      const off = tiffStart + view.getUint32(valueOffset, littleEndian);
      if (off + 24 <= view.byteLength) {
        const d = readRational(view, off, littleEndian);
        const m = readRational(view, off + 8, littleEndian);
        const s = readRational(view, off + 16, littleEndian);
        lon = d + m / 60 + s / 3600;
        hasLon = true;
      }
    }
  }

  if (hasLat) result.gpsLatitude = latRef === "S" ? -lat : lat;
  if (hasLon) result.gpsLongitude = lonRef === "W" ? -lon : lon;
}

/**
 * Extract EXIF metadata from an image file.
 * Returns null for non-JPEG files or files without EXIF.
 * Only reads the first 128KB — fast and memory-efficient.
 */
export async function extractExif(file: File): Promise<ExifData | null> {
  // Only JPEG/TIFF files have EXIF
  if (
    !file.type.startsWith("image/jpeg") &&
    !file.type.startsWith("image/tiff") &&
    !/\.jpe?g$/i.test(file.name) &&
    !/\.tiff?$/i.test(file.name)
  ) {
    return null;
  }

  const slice = file.slice(0, 128 * 1024);
  const buffer = await slice.arrayBuffer();
  const view = new DataView(buffer);

  // Check JPEG SOI marker
  if (view.getUint16(0) !== 0xffd8) return null;

  // Find APP1 marker with Exif header
  let offset = 2;
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset);

    if (marker === 0xffe1) {
      // APP1
      const length = view.getUint16(offset + 2);

      // Check "Exif\0\0" header
      if (
        offset + 10 < view.byteLength &&
        view.getUint32(offset + 4) === 0x45786966 && // "Exif"
        view.getUint16(offset + 8) === 0x0000
      ) {
        const tiffStart = offset + 10;

        // Byte order
        const byteOrder = view.getUint16(tiffStart);
        const littleEndian = byteOrder === 0x4949; // "II" = little endian

        // TIFF magic number
        if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
          return null;
        }

        // First IFD offset
        const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);

        const result: ExifData = {};
        readIFD(view, tiffStart, firstIfdOffset, littleEndian, result);

        // Only return if we found something
        if (Object.keys(result).length > 0) return result;
        return null;
      }

      offset += 2 + length;
    } else if ((marker & 0xff00) === 0xff00) {
      // Other marker — skip
      if (offset + 3 >= view.byteLength) break;
      const length = view.getUint16(offset + 2);
      offset += 2 + length;
    } else {
      break; // Not a marker, stop
    }
  }

  return null;
}
