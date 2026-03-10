"use no memo";

import { type RefObject } from "react";
import { LoaderCircle } from "lucide-react";
import { SplitPanel } from "../../../components/SplitPanel";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "../../../components/CodeEditor";
import Preview from "./Preview";
import type { DocStats } from "../utils/markdown";

interface DesktopLayoutProps {
  source: string;
  setSource: (value: string) => void;
  html: string;
  tocHtml: string;
  showToc: boolean;
  ready: boolean;
  isParsing: boolean;
  stats: DocStats;
  editorRef: RefObject<CodeEditorHandle | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  onEditorScroll: () => void;
  onPreviewScroll: () => void;
}

export default function DesktopLayout({
  source,
  setSource,
  html,
  tocHtml,
  showToc,
  ready,
  isParsing,
  stats,
  editorRef,
  previewRef,
  onEditorScroll,
  onPreviewScroll,
}: DesktopLayoutProps) {
  return (
    <SplitPanel
      leftLabel={
        <>
          markdown
          <span className="ml-3 font-normal normal-case tracking-normal opacity-60">
            {stats.words} words · {stats.lines} lines · {stats.readingTime}
          </span>
        </>
      }
      rightLabel={
        <>
          preview
          {isParsing && (
            <LoaderCircle
              size={10}
              className="ml-2 inline-block animate-spin opacity-50 align-middle"
            />
          )}
        </>
      }
      left={
        <CodeEditor
          ref={editorRef}
          value={source}
          onChange={setSource}
          language="markdown"
          onScroll={onEditorScroll}
        />
      }
      right={
        <Preview
          ref={previewRef}
          html={html}
          tocHtml={tocHtml}
          showToc={showToc}
          ready={ready}
          onScroll={onPreviewScroll}
        />
      }
    />
  );
}
