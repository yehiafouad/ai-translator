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

async function processFile(filePath: string): Promise<void> {
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
  } else {
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
      stopProgress(`Error translating file ${filePath} to ${langKey}\n`, false);
    }
  }
}

// async function translateInBatches(
//   jsonData: any,
//   langKey: string,
//   uuid: string
// ) {
//   const apiCalls = Object.keys(jsonData).map((key) => async () => {
//     return await translateRequest({ [key]: jsonData[key] }, langKey, uuid);
//   });

//   return await processApiCallsInBatches(apiCalls);
// }

async function translateFiles(inputFile: string) {
  startTime = performance.now();

  if (!argv.l) delete languages[langKey];

  try {
    const promises = paths.map((p) => processFile(p));
    await Promise.all(promises);

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
  consoleMessage = "✔ Translation complete for all languages! Files saved!";
  printTitleInfo(`${"=".repeat(consoleMessage.length)}\n\n`);
  printSuccess(`${consoleMessage}\n`, false);

  let totalMins: number = 0;
  Object.keys(filesListLog).forEach((key) => {
    printTitleInfo(`* ${key}:`);
    printInfo(`   • Saved Files: ${filesListLog[key]["success"].length}`);
    printInfo(`   • Failed Files: ${filesListLog[key]["failure"].length}`);
    filesListLog[key]["failure"].forEach((f) => {
      printError(`  ${f.fileID} - ${f.path}`, true);
    });
    printInfo(`   • Total Time: ${filesListLog[key].finishedTime} mins`);
    totalMins += parseFloat(filesListLog[key].finishedTime.toFixed(2));
  });

  printInfo(`• Total Mins: ${totalMins} mins`);
  printTitleInfo(`\n\n${"=".repeat(consoleMessage.length)}`);
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
        let newFolderName: string = `${dirname}-${langISOCode}`;

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
