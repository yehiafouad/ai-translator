#!/usr/bin/env node
import fs from "fs-extra";
import yargs from "yargs";
import { convertXMLToJson, jsonToXML } from "./utils/xml-handler";
import { jsonToStrings, stringsToJson } from "./utils/strings-handler";
import * as path from "path";
import { extensions, languages, platforms } from "./utils/constants";
import { translateRequest } from "./utils/translate-ai";
import {
  printError,
  printInfo,
  printSuccess,
  printSuccessMessage,
  printTitleInfo,
  stopProgress,
} from "./utils/console-print";
import { checkPath, findFiles, getKeyByValue } from "./utils/common";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import dotEnv from "dotenv";

dotEnv.config();

// Convert the module URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define CLI arguments
const argv: any = yargs(process.argv.slice(2))
  .usage("Usage: Transforming Localization Files")
  .command(process.argv, "Translate Files")
  .option("source", {
    alias: "s",
    type: "string",
    describe: "Source folder",
    demandOption: true,
    required: true,
  })
  .option("platform", {
    alias: "p",
    type: "string",
    describe: "Platform name",
    choices: Object.values(platforms),
    demandOption: false,
    required: false,
  })
  .option("convert", {
    alias: "c",
    type: "boolean",
    describe: "Convert files",
    demandOption: false,
    default: false,
    required: false,
  })
  .option("language", {
    alias: "l",
    type: "string",
    choices: Object.values(languages),
    describe: "Language to translate",
    demandOption: false,
    required: false,
  })
  .help().argv as any;

const sourcePath = argv.s;
let platform: string = argv.p || null,
  langISOCode: string = argv.l,
  langKey: string = "",
  isConverted = argv.c,
  startTime: number,
  endTime: number,
  totalMins: number = 0,
  filesListLog: {
    [key: string]: {
      success: {
        path: string;
        fileID: string;
      }[];
      failure: {
        path: string;
        fileID: string;
      }[];
      finishedTime: number;
    };
  } = {},
  consoleMessage: string = "";

const paths = await findFiles(sourcePath);
consoleMessage = `Found ${paths.length} files`;
printInfo(`${consoleMessage}\n${"*".repeat(consoleMessage.length)}`);

langISOCode = !langISOCode ? Object.values(languages)[0] : langISOCode;
langKey = getKeyByValue(languages, langISOCode) || languages[langISOCode];

async function convertFile(filePath: string): Promise<any> {
  printTitleInfo(`\n${"=".repeat(50)}`);
  printTitleInfo(`Processing File: ${filePath}`);
  printTitleInfo(`${"=".repeat(50)}`);

  const pathData = await checkPath(filePath, isConverted);
  if (pathData?.platform) platform = pathData.platform;
  if (pathData?.language && !langISOCode)
    langISOCode = languages[pathData.language].split(",")[0];

  const fileData = await fs.readFile(filePath, "utf-8");
  const fileSize = (await fs.stat(filePath)).size / 1024;
  const lines = fileData.split("\n").length;

  printInfo(`• Number of lines: ${lines}`);
  printInfo(`• File size: ${fileSize.toFixed(2)} KB`);

  const jsonData = await transformFiles(filePath, fileData);

  if (!jsonData) {
    calculateOperationStatus(filePath, "", "failure", "filesCount");
    printError(`Error processing File Translation: ${filePath}\n`);
    return null;
  } else {
    return { filePath, jsonData };
  }
}

async function translateFilesInBatches(
  filesData: { filePath: string; jsonData: any }[],
  batchSize: number = 50
) {
  let batchCount: number = 0;
  for (let i = 0; i < filesData.length; i += batchSize) {
    const batch = filesData.slice(i, i + batchSize);
    batchCount += batch.length;
    printTitleInfo(`* Starting batch (${batchCount}/${filesData.length})...`);
    await Promise.all(
      batch.map(async ({ filePath, jsonData }) => {
        const uuid = uuidv4();
        try {
          const translatedJsonData = await translateRequest(
            jsonData,
            langKey,
            uuid
          );
          if (!translatedJsonData) throw "Failed to translate file ";

          stopProgress(`Translated Successfully`);
          await transformFiles(filePath, translatedJsonData, true);
          calculateOperationStatus(filePath, uuid, "success", "filesCount");

          printSuccessMessage(filePath);
        } catch (apiError) {
          calculateOperationStatus(filePath, uuid, "failure", "filesCount");
          stopProgress(
            `Error translating file ${filePath} to ${langKey}\n`,
            false
          );
        }
      })
    );
  }
}

async function translateFiles(inputFile: string) {
  startTime = performance.now();

  if (!argv.l) delete languages[langKey];

  try {
    const filesData = await Promise.all(paths.map(convertFile));
    const validFilesData = filesData.filter((data) => data !== null);

    await translateFilesInBatches(validFilesData);

    printSuccess(`Completed translations for ${langKey}`);
    calculateOperationStatus("", "", "success", "timing");
    printInfo(`• Total Mins: ${totalMins} mins`);

    if (!argv.l) {
      const remainingLanguages = Object.keys(languages).filter(
        (l) => l !== langKey
      );

      if (remainingLanguages.length > 0) {
        langKey = remainingLanguages[0];
        langISOCode = languages[langKey];
        const translatingMessage = `Starting Translation Files To ${langKey}`;

        printInfo(
          `${translatingMessage}\n${"*".repeat(translatingMessage.length)}`
        );

        await translateFiles(inputFile);
      } else {
        printFinalResult();
      }
    } else {
      printFinalResult();
    }
  } catch (error) {
    printError("Error processing File Translation");
  }
}

function printFinalResult() {
  let totalMins: number = 0;
  const logEntries: string[] = [];
  consoleMessage = "✔ Translation complete for all languages! Files saved!";
  printTitleInfo(`${"=".repeat(consoleMessage.length)}\n\n`);
  printSuccess(`${consoleMessage}\n`, false);

  Object.keys(filesListLog).forEach((key) => {
    const successCount = filesListLog[key]["success"].length;
    const failureCount = filesListLog[key]["failure"].length;
    const finishedTime = filesListLog[key].finishedTime.toFixed(2);

    logEntries.push(`* ${key}:`);
    logEntries.push(`   • Saved Files: ${successCount}`);
    logEntries.push(`   • Failed Files: ${failureCount}`);
    filesListLog[key]["failure"].forEach((f) => {
      logEntries.push(`  ${f.fileID} - ${f.path}`);
    });
    logEntries.push(`   • Total Time: ${finishedTime} mins`);

    totalMins += parseFloat(finishedTime);
  });
  logEntries.push(`• Total Mins: ${totalMins.toFixed(2)} mins`);
  printInfo(logEntries.join("\n"));

  printTitleInfo(`\n\n${"=".repeat(consoleMessage.length)}`);
  logEntries.push(`\n${"=".repeat(consoleMessage.length)}`);

  // Ensure the logs directory exists
  const logsDir = path.resolve(__dirname, "../logs");
  fs.ensureDirSync(logsDir);

  // Write to log file
  const logFilePath = path.join(logsDir, `${platform}_translation_log.txt`);
  const dateTime = new Date().toISOString();
  const logContent = `Date: ${dateTime}\n${logEntries.join("\n")}\n\n`;

  fs.appendFileSync(logFilePath, logContent, "utf-8");
  printInfo(`Report Log for executed to ${logFilePath}`);
}

function calculateOperationStatus(
  filePath: string = "",
  uuid: string,
  status: "success" | "failure",
  prefix: "filesCount" | "timing"
) {
  if (prefix === "filesCount") {
    if (!filesListLog[langKey]) {
      filesListLog[langKey] = {
        success: [],
        failure: [],
        finishedTime: 0,
      };
    }
    filesListLog[langKey][status].push({
      path: filePath,
      fileID: uuid,
    });
  } else {
    endTime = performance.now();
    const translationTime: number = Number(
      ((endTime - startTime) / 60000).toFixed(2)
    );
    totalMins += translationTime;
    filesListLog[langKey].finishedTime = translationTime;

    return totalMins;
  }
}

const transformFiles = async (
  filePath: string,
  fileData: any,
  reverted: boolean = false
) => {
  let resolvedSourcePath = path.resolve(filePath);
  let dirRoute = path.dirname(resolvedSourcePath);
  const parsedPath = path.parse(filePath);

  let lastDirName = path.basename(dirRoute);
  let destPath = path.join(
    path.resolve(path.dirname(resolvedSourcePath), ".."),
    `${lastDirName}_${langISOCode || "ar"}`
  );
  let jsonData: any;

  switch (platform) {
    case platforms.ios:
      if (!reverted && parsedPath.ext === extensions.ios) {
        jsonData = await stringsToJson(filePath, destPath);
      } else {
        let newFolderName = lastDirName.replace(
          /^([a-z]{2})(?=\.lproj$)/i,
          langISOCode || "ar"
        );
        const dirPath = path.dirname(resolvedSourcePath);
        destPath = path.join(path.resolve(dirPath, ".."), newFolderName);

        fs.ensureDirSync(destPath);

        await jsonToStrings(filePath, destPath, fileData);
      }

      break;
    case platforms.android:
      if (!reverted && parsedPath.ext === extensions.android) {
        jsonData = await convertXMLToJson(fileData);
      } else {
        const dirPath = path.dirname(resolvedSourcePath);
        const dirname = path.basename(dirPath);
        let newFolderName: string = `values-${langISOCode}`;

        destPath = path.join(path.resolve(dirPath, ".."), newFolderName);
        fs.ensureDirSync(destPath);
        await jsonToXML(fileData, filePath, destPath, langISOCode);
      }

      break;
    default:
      if (reverted && parsedPath.ext === extensions.portal) {
        const outputFileName = `${parsedPath.name}_${langISOCode}${parsedPath.ext}`;
        const outputFilePath = path.join(dirRoute, outputFileName);
        await fs.writeFile(outputFilePath, JSON.stringify(fileData), "utf-8");

        printSuccess(`Converted: ${filePath} → ${outputFilePath}\n`);
      } else {
        jsonData = JSON.parse(fileData);
      }

      break;
  }

  return jsonData;
};

if (!sourcePath) {
  printError("Invalid command.");
  process.exit(1);
}

// Run the function
const translatingMessage = `Starting Translation Files To ${langKey}`;
printInfo(`${translatingMessage}\n${"*".repeat(translatingMessage.length)}`);
translateFiles(sourcePath);
