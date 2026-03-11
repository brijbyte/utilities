/**
 * Web Worker that runs the clean markdown→HTML pipeline
 * (no data-source-line attributes). Keeps the main thread free
 * when the user triggers copy / export / print.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;

async function getProcessor() {
  if (!processor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highlighter: any = await createHighlighterCore({
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

    processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeShikiFromHighlighter, highlighter, {
        themes: { light: "vitesse-light", dark: "vitesse-dark" },
        defaultColor: false as const,
        fallbackLanguage: "text",
      })
      .use(rehypeStringify);
  }
  return processor;
}

self.onmessage = async (e: MessageEvent<{ id: number; source: string }>) => {
  const { id, source } = e.data;
  try {
    const proc = await getProcessor();
    const normalized = source.replace(/^(\s*[-*+]\s)\[\]/gm, "$1[ ]");
    const file = await proc.process(normalized);
    self.postMessage({ id, html: String(file) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
