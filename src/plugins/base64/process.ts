import type { ProcessFn } from "../../types";

export const encode: ProcessFn = async (input) => {
  const text = input.data as string;
  return { type: "text", data: btoa(unescape(encodeURIComponent(text))) };
};

export const decode: ProcessFn = async (input) => {
  const text = input.data as string;
  return { type: "text", data: decodeURIComponent(escape(atob(text.trim()))) };
};
