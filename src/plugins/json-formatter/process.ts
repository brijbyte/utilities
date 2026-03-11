import type { ProcessFn } from "../../types";

/**
 * Strip JSONC extensions: single-line comments, block comments, and trailing commas.
 * Preserves strings (won't strip comment-like content inside quoted strings).
 */
function stripJsonc(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    // String literal — copy verbatim
    if (text[i] === '"') {
      const start = i;
      i++; // skip opening quote
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\") i++; // skip escaped char
        i++;
      }
      i++; // skip closing quote
      result += text.slice(start, i);
      continue;
    }
    // Single-line comment
    if (text[i] === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    // Block comment
    if (text[i] === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2; // skip */
      continue;
    }
    result += text[i];
    i++;
  }
  // Remove trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, "$1");
}

function parse(text: string, jsonc: boolean): unknown {
  return JSON.parse(jsonc ? stripJsonc(text) : text);
}

export const format: ProcessFn<{ indent: string; jsonc?: string }> = async (
  input,
  config,
) => {
  const parsed = parse(input.data as string, config.jsonc === "true");
  return {
    type: "text",
    data: JSON.stringify(parsed, null, Number(config.indent)),
  };
};

export const minify: ProcessFn<{ jsonc?: string }> = async (input, config) => {
  const parsed = parse(input.data as string, config.jsonc === "true");
  return { type: "text", data: JSON.stringify(parsed) };
};
