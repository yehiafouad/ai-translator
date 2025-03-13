import { extensions, platforms } from "./constants";
import path from "path";
import fs from "fs-extra";
import { printError, printSuccess } from "./console-print";
import chalk from "chalk";

export function isEnglishOnly(text: string, fullPath: string): boolean {
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
      printError(
        `CharCode not supported ${i} ${text[i]} ${charCode} on file: ${fullPath}\n`
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

async function validateFile(fullPath: string) {
  let fileData = await fs.readFile(fullPath, "utf-8");
  const isEnglishContent = isEnglishOnly(fileData, fullPath);

  if (!isEnglishContent) return null;
  if (path.extname(fullPath) !== extensions.portal) return fullPath;

  return null;
}

// Function to find all files recursively
export async function findFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const dirs = dir.split(",");
  const extRegex = /(.strings|.xml|.json)/i;
  const portalDirRegex = /(Localisation|Localization)/i;

  for (const singleDir of dirs) {
    const stat = fs.statSync(singleDir);
    const isFile = stat.isFile();

    if (isFile && path.extname(singleDir).match(extRegex)) {
      const isValid = await validateFile(singleDir);
      if (isValid) results.push(isValid);
    } else {
      const files = fs.readdirSync(singleDir);

      for (const file of files) {
        const fullPath = path.join(singleDir, file);
        const statFile = fs.statSync(fullPath);

        if (statFile.isDirectory()) {
          results = results.concat(await findFiles(fullPath));
        } else if (path.extname(fullPath).match(extRegex)) {
          const isValidPath = await validatePath(fullPath);

          if (isValidPath) {
            const isValid = await validateFile(fullPath);
            if (isValid) results.push(isValid);
          }
        }
      }
    }
  }

  return results;
}

async function validatePath(fullPath: string) {
  const portalDirRegex = /(Localisation|Localization)/i;
  const extName = path.extname(fullPath);
  const dirName = path.dirname(fullPath);
  const baseName = path.basename(dirName);

  if (extName === extensions.ios && baseName === "en.lproj") {
    return true;
  } else if (extName === extensions.android && baseName === "values") {
    return true;
  } else if (
    extName === extensions.portal &&
    path.dirname(fullPath).match(portalDirRegex)
  ) {
    let fileData = await fs.readFile(fullPath, "utf-8");

    fileData = JSON.parse(fileData);
    if (!Object.keys(fileData).length) return null;
    const hasObject =
      Array.isArray(fileData) ||
      Object.values(fileData).every((f) => typeof f === "object");

    if (!hasObject) return true;
  }

  return false;
}

export async function findMissingFiles(
  dir: string,
  prefix: string = "zh.lproj"
): Promise<string[]> {
  let results: string[] = [];
  const dirs = dir.split(",");
  const localizationDirRegex = /Localization$/i; // Ensure it matches directories ending with "Localization"

  for (const singleDir of dirs) {
    const stat = fs.statSync(singleDir);
    const isFile = stat.isFile();

    if (!isFile) {
      const files = fs.readdirSync(singleDir);
      const isLocalizationDir = localizationDirRegex.test(singleDir);

      if (isLocalizationDir && !files.includes(prefix)) {
        console.log(`Missing ${prefix} in: ${singleDir}`);
        results.push(singleDir);
      }

      for (const file of files) {
        const fullPath = path.join(singleDir, file);
        const statFile = fs.statSync(fullPath);

        if (statFile.isDirectory()) {
          results = results.concat(await findMissingFiles(fullPath, prefix));
        }
      }
    }
  }

  return results;
}

export function renameFolders(dir: string) {
  const fileData = fs.readdirSync(dir, { withFileTypes: true });

  fileData.forEach((file) => {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (file.name === "no.lproj") {
        const newPath = path.join(dir, "nb.lproj");
        fs.rename(fullPath, newPath, (err) => {
          if (err) {
            console.error(`Error renaming ${fullPath}:`, err);
          } else {
            printSuccess(
              `Renamed: ${chalk.white(fullPath)} -> ${chalk.white(newPath)}`
            );
          }
        });
      } else {
        // Recursively check subdirectories
        renameFolders(fullPath);
      }
    }
  });
}
