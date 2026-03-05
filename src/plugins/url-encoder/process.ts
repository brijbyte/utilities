import type { ProcessFn } from "../../types";

export const encode: ProcessFn = async (input) => {
  return { type: "text", data: encodeURIComponent(input.data as string) };
};

export const decode: ProcessFn = async (input) => {
  return { type: "text", data: decodeURIComponent(input.data as string) };
};

export const encodeAll: ProcessFn = async (input) => {
  const text = input.data as string;
  return {
    type: "text",
    data: Array.from(new TextEncoder().encode(text))
      .map((b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`)
      .join(""),
  };
};
