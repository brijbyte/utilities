import { Toolbar } from "@base-ui/react/toolbar";
import { Play, Trash2, RotateCcw } from "lucide-react";
import { Button } from "../../../components/Button";

interface EditorToolbarProps {
  hasFile: boolean;
  hasMeta: boolean;
  anyEnabled: boolean;
  isProcessing: boolean;
  onProcess: () => void;
  onResetOps: () => void;
  onClear: () => void;
}

export function EditorToolbar({
  hasFile,
  hasMeta,
  anyEnabled,
  isProcessing,
  onProcess,
  onResetOps,
  onClear,
}: EditorToolbarProps) {
  return (
    <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
      <>
        <Toolbar.Button
          disabled={!hasFile || !anyEnabled || isProcessing}
          render={(props) => (
            <Button
              {...props}
              variant="primary"
              onClick={onProcess}
              className="gap-1"
            >
              <Play size={11} />
              Process
            </Button>
          )}
        />

        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-1" />
      </>

      <Toolbar.Group className="ml-auto flex items-center gap-tb">
        {hasFile && hasMeta && (
          <Toolbar.Button
            disabled={isProcessing}
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={onResetOps}
                className="gap-1"
              >
                <RotateCcw size={11} />
                Reset
              </Button>
            )}
          />
        )}
        {hasFile && (
          <Toolbar.Button
            disabled={isProcessing}
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={onClear}
                className="gap-1"
              >
                <Trash2 size={11} />
                Clear
              </Button>
            )}
          />
        )}
      </Toolbar.Group>
    </Toolbar.Root>
  );
}
