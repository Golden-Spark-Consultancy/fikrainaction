import catalog from "../../messages/catalog.json";
import { resolveLocale, type Locale } from "./config";

type MessageTree = Record<string, unknown>;

const messages = catalog as Record<Locale, MessageTree>;

export function getMessages(locale: Locale): MessageTree {
  return messages[resolveLocale(locale)] ?? messages.en;
}

export function createTranslator(locale: Locale) {
  const tree = getMessages(locale);

  return function t(key: string, vars?: Record<string, string | number>): string {
    const parts = key.split(".");
    let current: unknown = tree;
    for (const part of parts) {
      if (current && typeof current === "object" && part in (current as MessageTree)) {
        current = (current as MessageTree)[part];
      } else {
        current = undefined;
        break;
      }
    }
    let text = typeof current === "string" ? current : key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

export type Translator = ReturnType<typeof createTranslator>;
