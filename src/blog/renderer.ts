/**
 * Blog renderer — Node-only module.
 * Compiles MDX files to HTML fragments + frontmatter metadata.
 * Used by:
 *   - Blog React components (loaded via virtual module in dev, or eagerly in SSR)
 *   - prerender.js (build-time static generation)
 *
 * Does NOT produce full pages — the React components handle layout.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import type { ArticleMeta } from "./types.ts";

// ── Helpers ─────────────────────────────────────────────────────────

const ARTICLES_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "articles",
);

/** Parse `NNN_slug.mdx` filename into { order, slug }. */
function parseFilename(
  filename: string,
): { order: number; slug: string } | null {
  const match = filename.match(/^(\d+)_(.+)\.mdx$/);
  if (!match) return null;
  return { order: parseInt(match[1], 10), slug: match[2] };
}

// ── MDX compilation ─────────────────────────────────────────────────

export interface CompiledArticle {
  meta: ArticleMeta;
  /** The rendered MDX content as an HTML string (no wrapper/layout). */
  contentHtml: string;
}

async function compileMdx(
  source: string,
  slug: string,
): Promise<CompiledArticle> {
  const result = await compile(source, {
    remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
    rehypePlugins: [rehypeHighlight],
    outputFormat: "function-body",
    development: false,
  });

  const code = String(result);
  const fn = new Function(code);
  const mod = fn(jsxRuntime) as {
    default: React.ComponentType;
    frontmatter?: Record<string, unknown>;
  };

  const frontmatter = mod.frontmatter ?? {};
  const meta: ArticleMeta = {
    slug,
    date: (frontmatter.date as string) ?? "",
    title: (frontmatter.title as string) ?? slug,
    description: (frontmatter.description as string) ?? "",
    tags: Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : [],
  };

  const contentHtml = renderToStaticMarkup(createElement(mod.default));
  return { meta, contentHtml };
}

// ── Public API ──────────────────────────────────────────────────────

/** List all article files, sorted newest-first (highest order number first). */
export async function listArticleFiles(): Promise<string[]> {
  const files = await fs.readdir(ARTICLES_DIR);
  return files
    .filter((f) => f.endsWith(".mdx") && parseFilename(f) !== null)
    .sort((a, b) => parseFilename(b)!.order - parseFilename(a)!.order);
}

/** Get all articles metadata, sorted newest-first (by file order). */
export async function getAllArticles(): Promise<ArticleMeta[]> {
  const files = await listArticleFiles();
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const parsed = parseFilename(file)!;
    const source = await fs.readFile(path.join(ARTICLES_DIR, file), "utf-8");
    const { meta } = await compileMdx(source, parsed.slug);
    articles.push(meta);
  }

  return articles;
}

/** Compile a single article and return meta + HTML fragment. */
export async function getArticle(
  slug: string,
): Promise<CompiledArticle | null> {
  const files = await listArticleFiles();
  const file = files.find((f) => parseFilename(f)?.slug === slug);
  if (!file) return null;

  const parsed = parseFilename(file)!;
  const source = await fs.readFile(path.join(ARTICLES_DIR, file), "utf-8");
  return compileMdx(source, parsed.slug);
}
