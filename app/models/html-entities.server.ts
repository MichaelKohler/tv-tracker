import { decode } from "entities";

export function decodeHtmlEntities(text: string | null) {
  if (!text) {
    return "";
  }
  return decode(text);
}
