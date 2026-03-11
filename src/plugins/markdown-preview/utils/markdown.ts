/**
 * Markdown parsing engine — browser-compatible, no React.
 *
 * Uses the unified / remark / rehype pipeline:
 *   remark-parse → remark-gfm → remark-rehype → rehype-slug → rehype-stringify
 *
 * Code block highlighting uses @shikijs/rehype/core with a custom shiki
 * highlighter (shiki/core + JS regex engine) that bundles only a curated
 * set of ~17 popular languages. This avoids bundling all 300+ shiki
 * grammars and the Oniguruma WASM engine. Unsupported languages render
 * as plain text via fallbackLanguage.
 *
 * GFM gives us tables, strikethrough, autolinks, task lists.
 * rehype-slug auto-generates heading IDs for TOC anchor links.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import vitesseLight from "shiki/themes/vitesse-light.mjs";
import vitesseDark from "shiki/themes/vitesse-dark.mjs";

// Curated set of common languages — loaded eagerly but only these are bundled.
// Unsupported languages fall back to plain text via fallbackLanguage.
import langJs from "shiki/langs/javascript.mjs";
import langTs from "shiki/langs/typescript.mjs";
import langHtml from "shiki/langs/html.mjs";
import langCss from "shiki/langs/css.mjs";
import langJson from "shiki/langs/json.mjs";
import langPython from "shiki/langs/python.mjs";
import langBash from "shiki/langs/bash.mjs";
import langMarkdown from "shiki/langs/markdown.mjs";
import langSql from "shiki/langs/sql.mjs";
import langYaml from "shiki/langs/yaml.mjs";
import langDiff from "shiki/langs/diff.mjs";
import langXml from "shiki/langs/xml.mjs";
import langJsx from "shiki/langs/jsx.mjs";
import langTsx from "shiki/langs/tsx.mjs";
import langGo from "shiki/langs/go.mjs";
import langRust from "shiki/langs/rust.mjs";
import langToml from "shiki/langs/toml.mjs";

/* ── Shiki highlighter (curated languages, JS regex engine) ────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let highlighterPromise: Promise<any> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [vitesseLight, vitesseDark],
      langs: [
        langJs,
        langTs,
        langHtml,
        langCss,
        langJson,
        langPython,
        langBash,
        langMarkdown,
        langSql,
        langYaml,
        langDiff,
        langXml,
        langJsx,
        langTsx,
        langGo,
        langRust,
        langToml,
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

/* ── Unified processor ─────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _processor: any = null;

async function getProcessor() {
  if (!_processor) {
    const highlighter = await getHighlighter();
    _processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeShikiFromHighlighter, highlighter, {
        themes: { light: "vitesse-light", dark: "vitesse-dark" },
        defaultColor: false,
        fallbackLanguage: "text",
      })
      .use(rehypeStringify);
  }
  return _processor;
}

/* ── TOC types ─────────────────────────────────────────────────── */

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

/* ── Public API ────────────────────────────────────────────────── */

export interface ParseResult {
  html: string;
  toc: TocEntry[];
}

/** Parse markdown source to HTML + TOC entries (async — shiki lazy-loads grammars). */
export async function parseMarkdown(source: string): Promise<ParseResult> {
  // Normalize `- []` → `- [ ]` so GFM recognizes them as task list items.
  // The GFM spec requires a space inside the brackets, but `- []` is a
  // common shorthand that people expect to work.
  const normalized = source.replace(/^(\s*[-*+]\s)\[\]/gm, "$1[ ]");
  const processor = await getProcessor();
  const file = await processor.process(normalized);
  const html = String(file);
  const toc = extractToc(source);
  return { html, toc };
}

/**
 * Extract TOC entries from raw markdown by scanning ATX headings.
 * Intentionally simple — parses source text, not the AST.
 */
function extractToc(source: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = source.split("\n");
  let inCodeFence = false;

  for (const line of lines) {
    if (
      line.trimStart().startsWith("```") ||
      line.trimStart().startsWith("~~~")
    ) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].replace(/\*\*|__|[*_`]/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");
    entries.push({ level, text, id });
  }
  return entries;
}

/** Generate a TOC HTML block from entries. */
export function renderToc(entries: TocEntry[]): string {
  if (entries.length === 0) return "";
  const items = entries
    .map((e) => {
      const indent = (e.level - 1) * 1.25;
      return `<li style="margin-left:${indent}rem"><a href="#${e.id}">${escapeHtml(e.text)}</a></li>`;
    })
    .join("\n");
  return `<nav class="md-toc"><strong>Table of Contents</strong><ul>${items}</ul></nav>`;
}

/* ── Stats ─────────────────────────────────────────────────────── */

export interface DocStats {
  words: number;
  chars: number;
  lines: number;
  readingTime: string;
}

export function getStats(source: string): DocStats {
  const lines = source.split("\n").length;
  const chars = source.length;
  const words = source.trim() ? source.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  const readingTime = `${minutes} min read`;
  return { words, chars, lines, readingTime };
}

/* ── Export helpers ─────────────────────────────────────────────── */

/** Build a standalone HTML document from rendered markdown. */
export function buildHtmlDocument(
  html: string,
  title: string,
  includeStyles: boolean,
  tocHtml?: string,
  /** When true, adds a sticky toolbar with print + close buttons (hidden in @media print). */
  showToolbar?: boolean,
): string {
  const styles = includeStyles ? getEmbeddedStyles() : "";
  const toc = tocHtml ? `${tocHtml}\n<hr />\n` : "";
  const toolbar = showToolbar ? getToolbarHtml(title) : "";
  const toolbarStyles = showToolbar ? getToolbarStyles() : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
${styles}
${toolbarStyles}
</head>
<body>
${toolbar}
<article class="markdown-body">
${toc}${html}
</article>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getToolbarHtml(title: string): string {
  return `<div class="preview-toolbar">
  <span class="preview-toolbar-title">${escapeHtml(title)}</span>
  <div class="preview-toolbar-actions">
    <button onclick="window.print()" class="preview-toolbar-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
      Print
    </button>
    <button onclick="window.close()" class="preview-toolbar-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      Close
    </button>
  </div>
</div>`;
}

function getToolbarStyles(): string {
  return `<style>
  .preview-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: #f6f8fa;
    border-bottom: 1px solid #d1d5da;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 0.8125rem;
  }
  .preview-toolbar-title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    color: #24292f;
  }
  .preview-toolbar-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .preview-toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    background: #fff;
    color: #24292f;
    cursor: pointer;
    white-space: nowrap;
    line-height: 1;
  }
  .preview-toolbar-btn:hover { background: #f0f0f0; }
  @media (prefers-color-scheme: dark) {
    .preview-toolbar { background: #161b22; border-bottom-color: #30363d; }
    .preview-toolbar-title { color: #c9d1d9; }
    .preview-toolbar-btn { background: #21262d; border-color: #30363d; color: #c9d1d9; }
    .preview-toolbar-btn:hover { background: #30363d; }
  }
  @media print {
    .preview-toolbar { display: none; }
  }
</style>`;
}

function getEmbeddedStyles(): string {
  return `<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 48rem;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #24292f;
    line-height: 1.6;
  }
  .markdown-body h1 { font-size: 2rem; font-weight: 600; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #d1d5da; padding-bottom: 0.3rem; }
  .markdown-body h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid #d1d5da; padding-bottom: 0.3rem; }
  .markdown-body h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  .markdown-body h4 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  .markdown-body p { margin-bottom: 1rem; }
  .markdown-body ul, .markdown-body ol { margin-bottom: 1rem; padding-left: 2rem; }
  .markdown-body li { margin-bottom: 0.25rem; }
  .markdown-body blockquote { border-left: 4px solid #d1d5da; padding-left: 1rem; color: #57606a; margin-bottom: 1rem; }
  .markdown-body code { font-family: "JetBrains Mono", monospace; font-size: 0.875em; background: #f6f8fa; padding: 0.15em 0.4em; border-radius: 3px; }
  .markdown-body pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; }
  .markdown-body pre code { background: none; padding: 0; font-size: 0.85rem; line-height: 1.6; }
  .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
  .markdown-body th, .markdown-body td { border: 1px solid #d1d5da; padding: 0.5rem 0.75rem; text-align: left; }
  .markdown-body th { background: #f6f8fa; font-weight: 600; }
  .markdown-body hr { border: none; border-top: 1px solid #d1d5da; margin: 2rem 0; }
  .markdown-body img { max-width: 100%; border-radius: 6px; }
  .markdown-body a { color: #0969da; text-decoration: none; }
  .markdown-body a:hover { text-decoration: underline; }
  .markdown-body .contains-task-list { list-style: none; padding-left: 0; }
  .markdown-body .task-list-item input { margin-right: 0.5rem; }
  .markdown-body .shiki { background: #f6f8fa !important; }
  .markdown-body .shiki, .markdown-body .shiki span { color: var(--shiki-light); font-weight: var(--shiki-light-font-weight); font-style: var(--shiki-light-font-style); }
  .markdown-body .md-toc { background: #f6f8fa; border: 1px solid #d1d5da; border-radius: 6px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; }
  .markdown-body .md-toc strong { display: block; margin-bottom: 0.5rem; }
  .markdown-body .md-toc ul { list-style: none; padding: 0; margin: 0; }
  .markdown-body .md-toc li { padding: 0.15rem 0; }
  .markdown-body .md-toc a { color: #0969da; text-decoration: none; }
  .markdown-body .md-toc a:hover { text-decoration: underline; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d1117; color: #c9d1d9; }
    .markdown-body h1, .markdown-body h2 { border-bottom-color: #30363d; }
    .markdown-body blockquote { border-left-color: #30363d; color: #8b949e; }
    .markdown-body code { background: #161b22; }
    .markdown-body pre { background: #161b22; }
    .markdown-body th, .markdown-body td { border-color: #30363d; }
    .markdown-body th { background: #161b22; }
    .markdown-body hr { border-top-color: #30363d; }
    .markdown-body a { color: #58a6ff; }
    .markdown-body .shiki { background: #161b22 !important; }
    .markdown-body .shiki, .markdown-body .shiki span { color: var(--shiki-dark); font-weight: var(--shiki-dark-font-weight); font-style: var(--shiki-dark-font-style); }
    .markdown-body .md-toc { background: #161b22; border-color: #30363d; }
    .markdown-body .md-toc a { color: #58a6ff; }
  }
</style>`;
}

/* ── Default sample ────────────────────────────────────────────── */

export const DEFAULT_MARKDOWN = `
# Markdown Preview

A **live preview** editor with full GFM support.

## Features

- ✅ GitHub Flavored Markdown (GFM)
- ✅ Tables, task lists, strikethrough
- ✅ Syntax highlighted code blocks
- ✅ Table of contents generation
- ✅ Scroll sync between editor and preview
- ✅ Export to HTML, print, copy

## Table Example

| Feature             | Status                 |
| ------------------- | ---------------------- |
| GFM tables          | ✅ Supported           |
| Task lists          | ✅ Supported           |
| Syntax highlighting | ✅ Supported           |
| ~~Strikethrough~~   | ✅ Supported           |
| Autolinks           | ✅ https://example.com |

## Task List

- [x] Write markdown parser
- [x] Add syntax highlighting
- [x] Implement scroll sync
- [ ] Write more documentation

## Code Example

\`\`\`typescript
interface User {
  name: string;
  email: string;
  role: "admin" | "user";
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

## Horizontal Rule

---

### Inline Code

Use \`console.log()\` for debugging and \`npm install\` to add packages.

## Blockquote

> Markdown is a lightweight markup language that you can use to add
> formatting elements to plaintext text documents.
>
> — John Gruber

_Edit the left panel to see changes here in real time._
`.trim();
