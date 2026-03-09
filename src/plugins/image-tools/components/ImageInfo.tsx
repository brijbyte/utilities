import { FileText, MapPin, ExternalLink } from "lucide-react";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Popover } from "../../../components/Popover";
import type { ImageMeta, QualityReport } from "../utils/types";
import type { ExifData } from "../utils/exif";
import { formatFileSize } from "../utils/types";

interface ImageReportProps {
  meta: ImageMeta;
  exif: ExifData | null;
  quality: QualityReport | null;
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.75">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className="text-text text-right truncate max-w-48">{value}</span>
    </div>
  );
}

function ColorRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.75">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className={`font-medium text-right capitalize ${color}`}>
        {value}
      </span>
    </div>
  );
}

function LinkRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.75">
      <span className="text-text-muted shrink-0">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-right truncate max-w-48 transition-colors"
      >
        {value}
        <ExternalLink size={9} className="shrink-0" />
      </a>
    </div>
  );
}

function MutedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.75">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className="text-text-muted italic text-right">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[0.5625rem] uppercase tracking-wider text-text-muted font-medium pt-2 pb-1 border-b border-border-muted mb-0.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExifDate(dateStr: string): string {
  const normalized = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGPS(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

function mapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

// ── Quality label → color mapping ───────────────────────────

const qualityColors: Record<string, string> = {
  sharp: "text-success",
  soft: "text-warning",
  blurry: "text-danger",
  good: "text-success",
  dark: "text-warning",
  bright: "text-warning",
  flat: "text-danger",
  high: "text-success",
  medium: "text-warning",
  low: "text-danger",
  fair: "text-warning",
  poor: "text-danger",
};

// ── Component ───────────────────────────────────────────────

export function ImageReport({ meta, exif, quality }: ImageReportProps) {
  const hasExif = exif && Object.keys(exif).length > 0;
  const hasGps =
    exif?.gpsLatitude !== undefined && exif?.gpsLongitude !== undefined;

  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md border border-border-muted bg-bg-surface hover:bg-bg-hover cursor-pointer transition-colors text-[0.625rem] text-text-muted">
        <FileText size={12} />
        Report
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={4}>
          <Popover.Popup className="w-72 max-h-[28rem] bg-bg-surface border border-border rounded-lg shadow-lg text-[0.6875rem] leading-relaxed overflow-hidden">
            <Popover.Arrow />
            <ScrollArea.Root className="h-full max-h-[28rem]">
              <ScrollArea.Viewport className="h-full max-h-[28rem] overscroll-contain p-3">
                {/* Quality */}
                {quality && (
                  <Section title="Quality">
                    <ColorRow
                      label="Overall"
                      value={quality.overall}
                      color={qualityColors[quality.overall] ?? "text-text"}
                    />
                    <div className="flex items-baseline justify-between gap-4 py-0.75">
                      <span className="text-text-muted shrink-0">
                        Sharpness
                      </span>
                      <span className="text-right">
                        <span
                          className={`font-medium capitalize ${qualityColors[quality.blur.label] ?? "text-text"}`}
                        >
                          {quality.blur.label}
                        </span>
                        <span className="text-text-muted text-[0.5625rem] ml-1">
                          ({Math.round(quality.blur.score)})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 py-0.75">
                      <span className="text-text-muted shrink-0">Exposure</span>
                      <span className="text-right">
                        <span
                          className={`font-medium capitalize ${qualityColors[quality.exposure.label] ?? "text-text"}`}
                        >
                          {quality.exposure.label}
                        </span>
                        <span className="text-text-muted text-[0.5625rem] ml-1">
                          (μ{Math.round(quality.exposure.mean)} σ
                          {Math.round(quality.exposure.stdDev)})
                        </span>
                      </span>
                    </div>
                    <ColorRow
                      label="Resolution"
                      value={`${quality.resolution.label} (${quality.resolution.megapixels} MP)`}
                      color={
                        qualityColors[quality.resolution.label] ?? "text-text"
                      }
                    />
                  </Section>
                )}

                {/* File info */}
                <Section title="File">
                  <Row label="Name" value={meta.name} />
                  <Row label="Type" value={meta.type} />
                  <Row label="Size" value={formatFileSize(meta.size)} />
                  <Row
                    label="Last Modified"
                    value={formatDate(meta.lastModified)}
                  />
                </Section>

                {/* Image info */}
                <Section title="Image">
                  <Row
                    label="Dimensions"
                    value={`${meta.width} × ${meta.height}`}
                  />
                  <Row label="Megapixels" value={`${meta.megapixels} MP`} />
                  <Row label="Aspect Ratio" value={meta.aspectRatio} />
                  <Row label="Color Mode" value={meta.colorMode} />
                  <Row label="Bit Depth" value={meta.bitDepth} />
                </Section>

                {/* EXIF camera info */}
                {hasExif && (
                  <>
                    {(exif.make || exif.model || exif.lensModel) && (
                      <Section title="Camera">
                        <Row label="Make" value={exif.make} />
                        <Row label="Model" value={exif.model} />
                        <Row label="Lens" value={exif.lensModel} />
                        <Row label="Software" value={exif.software} />
                      </Section>
                    )}

                    {(exif.exposureTime ||
                      exif.fNumber ||
                      exif.iso ||
                      exif.focalLength) && (
                      <Section title="Exposure">
                        <Row
                          label="Shutter Speed"
                          value={
                            exif.exposureTime
                              ? `${exif.exposureTime}s`
                              : undefined
                          }
                        />
                        <Row label="Aperture" value={exif.fNumber} />
                        <Row
                          label="ISO"
                          value={
                            exif.iso !== undefined ? `${exif.iso}` : undefined
                          }
                        />
                        <Row label="Focal Length" value={exif.focalLength} />
                        <Row label="Flash" value={exif.flash} />
                        <Row label="Metering" value={exif.meteringMode} />
                        <Row label="Program" value={exif.exposureProgram} />
                        <Row label="White Balance" value={exif.whiteBalance} />
                      </Section>
                    )}

                    {(exif.dateTimeOriginal || exif.dateTime) && (
                      <Section title="Date">
                        <Row
                          label="Taken"
                          value={
                            exif.dateTimeOriginal
                              ? formatExifDate(exif.dateTimeOriginal)
                              : exif.dateTime
                                ? formatExifDate(exif.dateTime)
                                : undefined
                          }
                        />
                      </Section>
                    )}

                    {(exif.colorSpace ||
                      exif.imageDescription ||
                      exif.artist ||
                      exif.copyright) && (
                      <Section title="Other">
                        <Row label="Color Space" value={exif.colorSpace} />
                        <Row
                          label="Description"
                          value={exif.imageDescription}
                        />
                        <Row label="Artist" value={exif.artist} />
                        <Row label="Copyright" value={exif.copyright} />
                      </Section>
                    )}
                  </>
                )}

                {/* Location — always shown */}
                <Section title="Location">
                  {hasGps ? (
                    <>
                      <Row
                        label="Coordinates"
                        value={formatGPS(
                          exif!.gpsLatitude!,
                          exif!.gpsLongitude!,
                        )}
                      />
                      <LinkRow
                        label=""
                        value="View on Google Maps"
                        href={mapsUrl(exif!.gpsLatitude!, exif!.gpsLongitude!)}
                      />
                    </>
                  ) : (
                    <MutedRow
                      label="GPS"
                      value={!hasExif ? "No EXIF data" : "Not embedded"}
                    />
                  )}
                </Section>

                {/* Hint when no EXIF at all */}
                {!hasExif && (
                  <div className="pt-2 text-[0.5625rem] text-text-muted italic flex items-start gap-1.5">
                    <MapPin size={10} className="shrink-0 mt-0.5" />
                    <span>
                      EXIF data (camera, exposure, GPS) is available in original
                      JPEG photos from cameras and phones. Shared or screenshots
                      typically have it stripped.
                    </span>
                  </div>
                )}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="m-0.5 flex w-1.5 justify-center rounded-full bg-transparent opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0">
                <ScrollArea.Thumb className="w-full rounded-full bg-border" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
