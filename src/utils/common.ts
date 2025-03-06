import { extensions, platforms } from "./constants";
import path from "path";
import fs from "fs-extra";
import { stopProgress } from "./console-print";

export function isEnglishOnly(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (
      charCode > 127 &&
      !(charCode === 8216) && // left single quotation mark ‘
      !(charCode === 8217) && // right single quotation mark ’
      !(charCode === 8220) && // left double quotation mark “
      !(charCode === 8221) && // right double quotation mark ”
      !(charCode === 8226) && // bullet •
      !(charCode === 169) && // copyright symbol ©
      !(charCode === 8212) && // em dash —
      !(charCode === 8232) && // line separator
      !(charCode === 160) && // non-breaking space
      !(charCode === 8230) // ellipsis …
    ) {
      // Check for surrogate pairs for emojis
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        // High surrogate
        const nextCharCode = text.charCodeAt(i + 1);
        if (nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
          // Low surrogate
          i++; // Skip the low surrogate
          continue;
        }
      }
      stopProgress(
        `CharCode not supported ${i} ${text[i]} ${charCode}\n`,
        false
      );
      return false; // Found a non-ASCII character that is not allowed
    }
  }
  return true;
}

export function getKeyByValue(
  obj: Record<string, string>,
  value: string
): string | undefined {
  for (const [key, val] of Object.entries(obj)) {
    if (val === value) {
      return key;
    }
  }
  return undefined; // Return undefined if the value is not found
}

export async function checkPath(filePath: string, isConverted: boolean) {
  const platformRegex = /(android|ios|portal)/i;
  const languageRegex = /(hindi|french|urdu)/i;
  const extRegex = /(.strings|.xml|.json)/i;

  const platformMatch = filePath.toLowerCase().match(platformRegex);
  const languageMatch = filePath.toLowerCase().match(languageRegex);
  const extensionMatch = path.extname(filePath.toLowerCase()).match(extRegex);
  let platform: string | null = platformMatch?.[0]?.toLowerCase() || null;
  const language: string | null = languageMatch?.[0]?.toLowerCase() || null;
  let ext = extensionMatch?.[0]?.toLowerCase() || null;
  let result: {
    platform: string | null;
    language?: string | null;
    path: string;
  } = {
    platform,
    language,
    path: filePath,
  };

  if (isConverted)
    ext =
      platform === platforms.ios
        ? extensions.ios
        : platform === platforms.android
        ? extensions.android
        : extensions.portal;

  if (ext) {
    platform =
      ext === extensions.ios
        ? platforms.ios
        : ext === extensions.android
        ? platforms.android
        : platforms.portal;

    result = { ...result, platform };

    return result;
  }

  if (!platform && !language) return null;

  return null;
}

async function validateFile(fullPath: string, portalDirRegex: RegExp) {
  let fileData = await fs.readFile(fullPath, "utf-8");
  const isEnglishContent = isEnglishOnly(fileData);

  if (!isEnglishContent) return null;
  if (
    fullPath.endsWith(extensions.portal) &&
    path.dirname(fullPath).match(portalDirRegex)
  ) {
    fileData = JSON.parse(fileData);
    if (!Object.keys(fileData).length) return null;
    const hasObject =
      Array.isArray(fileData) ||
      Object.values(fileData).every((f) => typeof f === "object");

    if (!hasObject) return fullPath;
  } else if (path.extname(fullPath) !== extensions.portal) return fullPath;

  return null;
}

// Function to find all files recursively
export async function findFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const stat = fs.statSync(dir);
  const extRegex = /(.strings|.xml|.json)/i;
  const portalDirRegex = /(Localisation|Localization)/i;
  const isFile = stat.isFile();

  if (isFile && path.extname(dir).match(extRegex)) {
    const isValid = await validateFile(dir, portalDirRegex);
    if (isValid) results.push(isValid);

    return results;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const statFile = fs.statSync(fullPath);

    if (statFile.isDirectory()) {
      results = results.concat(await findFiles(fullPath));
    } else if (path.extname(fullPath).match(extRegex)) {
      const isValid = await validateFile(fullPath, portalDirRegex);

      if (isValid) results.push(isValid);
    }
  }
  return results;
}
