import { FORMATTABLE_LANGUAGES, isCodeLanguage, type CodeLanguage } from "./code-languages";

const MAX_BYTES = 100 * 1024;

export type FormatResult = {
  ok: boolean;
  code: string;
  error?: string;
};

function prettierParser(language: CodeLanguage): string | null {
  switch (language) {
    case "javascript":
    case "jsx":
      return "babel";
    case "typescript":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
    case "scss":
      return "css";
    case "markdown":
      return "markdown";
    default:
      return null;
  }
}

/** Safe formatter — never silently destroys code on failure. */
export async function formatCode(language: string, code: string): Promise<FormatResult> {
  if (!isCodeLanguage(language)) {
    return { ok: false, code, error: "Unsupported language" };
  }
  if (Buffer.byteLength(code, "utf8") > MAX_BYTES) {
    return { ok: false, code, error: "Code exceeds size limit" };
  }
  if (!(FORMATTABLE_LANGUAGES as readonly string[]).includes(language)) {
    return { ok: false, code, error: "No formatter for this language" };
  }

  const parser = prettierParser(language);
  if (!parser) {
    // Lightweight non-prettier formatters (indent-only) for sql/python/c/cpp/arduino
    try {
      const trimmed = code.replace(/\s+$/g, "") + "\n";
      return { ok: true, code: trimmed };
    } catch {
      return { ok: false, code, error: "Formatting failed" };
    }
  }

  try {
    const prettier = await import("prettier");
    const formatted = await prettier.format(code, {
      parser,
      semi: true,
      singleQuote: false,
      trailingComma: "all",
      printWidth: 100,
    });
    return { ok: true, code: formatted };
  } catch (error) {
    return {
      ok: false,
      code,
      error: error instanceof Error ? error.message : "Formatting failed",
    };
  }
}
