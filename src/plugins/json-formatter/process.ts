import {
  parse as parseJsonc,
  printParseErrorCode,
  type ParseError,
} from "jsonc-parser";
import type { ProcessFn } from "../../types";

function formatErrors(text: string, errors: ParseError[]): string {
  const lines = text.split("\n");
  return errors
    .map((e) => {
      let line = 1;
      let col = 1;
      for (let i = 0; i < e.offset && i < text.length; i++) {
        if (text[i] === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      const src = lines[line - 1]?.trim() ?? "";
      const snippet = src.length > 40 ? src.slice(0, 40) + "…" : src;
      return `${printParseErrorCode(e.error)} at line ${line}, column ${col}: ${snippet}`;
    })
    .join("\n");
}

function parse(text: string, jsonc: boolean): unknown {
  if (!jsonc) return JSON.parse(text);

  const errors: ParseError[] = [];
  const result = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) throw new SyntaxError(formatErrors(text, errors));
  return result;
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
