import { Check, Info } from "lucide-react";
import { Button } from "../../../components/Button";
import { GroupedSelect } from "../../../components/Select";
import type { SelectGroup } from "../../../components/Select";
import type {
  CropConfig,
  AspectPreset,
  CropRegion,
  PhotoTemplate,
} from "../utils/crop";
import { ASPECT_PRESETS, PHOTO_TEMPLATES, templatePixels } from "../utils/crop";
import { formatDimensions } from "../utils/types";

interface CropPanelProps {
  config: CropConfig;
  cropRegion: CropRegion;
  hasFaces: boolean;
  faceCount: number;
  onChange: (config: CropConfig) => void;
}

// ── Build grouped options for the template selector ─────────

const TEMPLATE_SELECT_GROUPS: SelectGroup[] = (() => {
  const regionMap = new Map<string, SelectGroup>();
  const groups: SelectGroup[] = [];
  for (const t of PHOTO_TEMPLATES) {
    let group = regionMap.get(t.region);
    if (!group) {
      group = { label: t.region, options: [] };
      regionMap.set(t.region, group);
      groups.push(group);
    }
    group.options.push({
      value: t.id,
      label: `${t.name} — ${t.widthMm}×${t.heightMm} mm`,
    });
  }
  return groups;
})();

const NO_TEMPLATE_VALUE = "__none__";

// ── Template info card ──────────────────────────────────────

function TemplateInfo({ template }: { template: PhotoTemplate }) {
  const px = templatePixels(template);
  return (
    <div className="flex flex-col gap-1.5 rounded border border-border-muted bg-bg-inset px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] font-medium text-text">
          {template.name}
        </span>
        <span className="text-[0.5rem] text-text-muted">{template.region}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.5625rem] text-text-muted">
        <span>
          {template.widthMm}×{template.heightMm} mm
        </span>
        <span>
          {px.width}×{px.height} px
        </span>
        <span>{template.dpi} DPI</span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm border border-border-muted"
            style={{ backgroundColor: template.bgColor }}
          />
          {template.bgColor}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 mt-0.5">
        {template.requirements.map((req, i) => (
          <div
            key={i}
            className="flex items-start gap-1.5 text-[0.5rem] text-text-muted"
          >
            <Check size={8} className="text-success shrink-0 mt-0.5" />
            <span>{req}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────

export function CropPanel({
  config,
  cropRegion,
  hasFaces,
  faceCount,
  onChange,
}: CropPanelProps) {
  const activeTemplate = config.template
    ? (PHOTO_TEMPLATES.find((t) => t.id === config.template) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Template selector */}
      <div>
        <div className="text-[0.5625rem] text-text-muted mb-1">
          Passport / Visa Template
        </div>
        <GroupedSelect
          value={config.template ?? NO_TEMPLATE_VALUE}
          onValueChange={(v) =>
            onChange({
              ...config,
              template: v === NO_TEMPLATE_VALUE ? null : v,
            })
          }
          options={[
            { value: NO_TEMPLATE_VALUE, label: "Manual crop (no template)" },
          ]}
          groups={TEMPLATE_SELECT_GROUPS}
          align="start"
          triggerClassName="w-full justify-between"
          popupMinWidth="min-w-64"
        />
      </div>

      {/* Template requirements info */}
      {activeTemplate && <TemplateInfo template={activeTemplate} />}

      {/* Manual aspect ratio presets (only when no template) */}
      {!activeTemplate && (
        <>
          <div>
            <div className="text-[0.5625rem] text-text-muted mb-1">
              Aspect Ratio
            </div>
            <div className="flex flex-wrap gap-1">
              {ASPECT_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  variant="outline"
                  active={config.aspect === p.value}
                  className="text-[0.625rem] px-2 py-1"
                  onClick={() =>
                    onChange({
                      ...config,
                      aspect: p.value as AspectPreset,
                    })
                  }
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Padding slider */}
          <label className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text">Padding</span>
              <span className="text-xs text-text-muted">
                {Math.round(config.padding * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={config.padding}
              onChange={(e) =>
                onChange({ ...config, padding: parseFloat(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[0.5rem] text-text-muted">
              <span>Tight</span>
              <span>Loose</span>
            </div>
          </label>
        </>
      )}

      {/* Face info */}
      {hasFaces ? (
        <p className="text-[0.5625rem] text-text-muted">
          {activeTemplate ? "Framing" : "Cropping"} around {faceCount} detected
          face
          {faceCount !== 1 ? "s" : ""}.
        </p>
      ) : (
        <p className="text-[0.5625rem] text-warning flex items-start gap-1">
          <Info size={10} className="shrink-0 mt-0.5" />
          <span>
            No faces detected —{" "}
            {activeTemplate
              ? "a face is required for passport photos. Run face detection first."
              : "using center crop. Run face detection first for smart cropping."}
          </span>
        </p>
      )}

      {/* Crop region info */}
      <div className="text-[0.5625rem] text-text-muted">
        Crop: {formatDimensions(cropRegion.width, cropRegion.height)} at (
        {cropRegion.x}, {cropRegion.y})
        {activeTemplate && (
          <>
            {" → "}
            {formatDimensions(
              templatePixels(activeTemplate).width,
              templatePixels(activeTemplate).height,
            )}{" "}
            output
          </>
        )}
      </div>
    </div>
  );
}
