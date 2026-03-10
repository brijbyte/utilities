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

/** Parse `YYYY-MM-DD_slug.mdx` filename into { date, slug }. */
function parseFilename(
  filename: string,
): { date: string; slug: string } | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})_(.+)\.mdx$/);
  if (!match) return null;
  return { date: match[1], slug: match[2] };
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
  date: string,
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
    date,
    title: (frontmatter.title as string) ?? slug,
    description: (frontmatter.description as string) ?? "",
    tags: Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : [],
  };

  const contentHtml = renderToStaticMarkup(createElement(mod.default));
  return { meta, contentHtml };
}

// ── Public API ──────────────────────────────────────────────────────

/** List all article files, sorted newest-first. */
export async function listArticleFiles(): Promise<string[]> {
  const files = await fs.readdir(ARTICLES_DIR);
  return files
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .reverse();
}

/** Get all articles metadata, sorted newest-first by date. */
export async function getAllArticles(): Promise<ArticleMeta[]> {
  const files = await listArticleFiles();
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const parsed = parseFilename(file);
    if (!parsed) continue;

    const source = await fs.readFile(path.join(ARTICLES_DIR, file), "utf-8");
    const { meta } = await compileMdx(source, parsed.slug, parsed.date);
    articles.push(meta);
  }

  articles.sort((a, b) => b.date.localeCompare(a.date));
  return articles;
}

/** Compile a single article and return meta + HTML fragment. */
export async function getArticle(
  slug: string,
): Promise<CompiledArticle | null> {
  const files = await listArticleFiles();
  const file = files.find((f) => {
    const parsed = parseFilename(f);
    return parsed?.slug === slug;
  });

  if (!file) return null;

  const parsed = parseFilename(file)!;
  const source = await fs.readFile(path.join(ARTICLES_DIR, file), "utf-8");
  return compileMdx(source, parsed.slug, parsed.date);
}
