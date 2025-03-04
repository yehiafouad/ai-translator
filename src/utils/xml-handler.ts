import { Builder, parseStringPromise } from "xml2js";
import fs from "fs-extra";
import path from "path";
import { printSuccess, printWarning } from "./console-print";
import { languages } from "./constants";

// Convert XML to JSON
export async function convertXMLToJson(data: any) {
  const parsedXml = await parseStringPromise(data);
  let modifiedXml: any;
  if (
    parsedXml.resources &&
    parsedXml.resources.string &&
    Array.isArray(parsedXml.resources.string)
  ) {
    parsedXml.resources.string.forEach((msg: any) => {
      modifiedXml = { [msg.$.name]: msg["_"], ...modifiedXml };
    });
  } else {
    printWarning(`Warning: 'message' property not found in XML structure.`);
  }
  // Format JSON with indentation
  modifiedXml = JSON.stringify(modifiedXml, null, 2);

  return JSON.parse(modifiedXml);
}

export async function jsonToXML(
  jsonData: any,
  inputPath: string,
  outputPath: string,
  language: string
) {
  const xmlStructure = {
    resources: {
      string: Object.entries(jsonData).map(([key, value]) => ({
        $: { name: key },
        _:
          language === "fr" ? (value as string).replaceAll(/'/g, "\\'") : value,
      })),
    },
  };

  // Convert JSON to XML
  const builder = new Builder({
    headless: false,
    xmldec: { version: "1.0", encoding: "UTF-8" }, // Do not include standalone
  });
  const xml = builder.buildObject(xmlStructure);

  const parsedPath = path.parse(inputPath);
  const baseFileName = parsedPath.name;
  const outputFileName = `${baseFileName}${parsedPath.ext}`;
  const outputFilePath = path.join(outputPath, outputFileName);

  await fs.writeFile(outputFilePath, xml, "utf-8");

  printSuccess(`Converted: ${inputPath} → ${outputFilePath}\n`);
}
