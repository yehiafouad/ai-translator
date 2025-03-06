import fs from "fs-extra";
import path from "path";
import { extensions } from "./constants";
import { printSuccess } from "./console-print";
import chalk from "chalk";

// Function to convert .strings to JSON
export async function stringsToJson(inputPath: string, destPath: string) {
  const data = fs.readFileSync(inputPath, "utf-8");
  const lines = data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("/*") && !line.startsWith("//"));

  const jsonObj: Record<string, string> = {};

  lines.forEach((line) => {
    // const match = line.match(/"(.+)"\s*=\s*"(.+)";/);
    const match = line.match(/"(.+)"\s*=\s*"(.*?)";/);
    if (match) {
      jsonObj[match[1]] = match[2];
    }
  });

  return jsonObj;
}

export async function jsonToStrings(
  inputPath: string,
  outputPath: string,
  jsonData: string
) {
  if (!jsonData) {
    const data = fs.readFileSync(inputPath, "utf8");
    jsonData = JSON.parse(data);
  }

  let stringsContent: any = "";

  // Convert JSON to .strings format
  for (const [key, value] of Object.entries(jsonData)) {
    stringsContent += `"${key}" = "${value}";\n`;
  }
  const outputFileName = path.basename(inputPath, extensions.portal);
  const outputFilePath = path.join(outputPath, outputFileName);
  fs.writeFileSync(outputFilePath, stringsContent, "utf8");

  printSuccess(`Converted: ${inputPath} → ${outputFilePath}\n`);
  return;
}
