import type { ProcessFn } from "../../types";

export const format: ProcessFn<{ indent: string }> = async (input, config) => {
  const parsed = JSON.parse(input.data as string);
  return {
    type: "text",
    data: JSON.stringify(parsed, null, Number(config.indent)),
  };
};

export const minify: ProcessFn = async (input) => {
  const parsed = JSON.parse(input.data as string);
  return { type: "text", data: JSON.stringify(parsed) };
};
