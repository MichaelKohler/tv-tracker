import { decode } from "entities";
import striptags from "striptags";

export function decodeHtmlEntities(text: string | null) {
  if (!text) {
    return "";
  }
  return decode(text);
}

export function htmlToPlainText(html: string | null | undefined) {
  return decodeHtmlEntities(striptags(html ?? ""));
}
