export const CODE_LANGUAGES = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "scss",
  "json",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "arduino",
  "bash",
  "powershell",
  "sql",
  "php",
  "go",
  "rust",
  "kotlin",
  "swift",
  "dart",
  "yaml",
  "xml",
  "markdown",
  "plaintext",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const FORMATTABLE_LANGUAGES = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "html",
  "css",
  "scss",
  "markdown",
  "sql",
  "python",
  "c",
  "cpp",
  "arduino",
] as const;

export function isCodeLanguage(value: string): value is CodeLanguage {
  return (CODE_LANGUAGES as readonly string[]).includes(value);
}
