import { Builder, parseStringPromise } from "xml2js";
import fs from "fs-extra";
import path from "path";
import { printSuccess } from "./console-print";

// Convert XML to JSON
export async function convertXMLToJson(data: string) {
  const parsedXml = await parseStringPromise(data);
  let modifiedXml: any = {};

  if (parsedXml.resources && parsedXml.resources.string) {
    const message = parsedXml.resources.string;

    if (Array.isArray(message)) {
      message.forEach((msg: any) => {
        modifiedXml[msg.$.name] = decodeXmlEntities(msg["_"]);
      });
    } else {
      modifiedXml[message.$.name] = decodeXmlEntities(message["_"]);
    }
  } else {
    console.warn(`Warning: 'message' property not found in XML structure.`);
  }

  return modifiedXml;
}

// Function to properly decode XML entities
function decodeXmlEntities(text: string) {
  if (text) {
    return text
      .replace(/\\n/g, "\n") // Convert escaped \n back to actual newlines
      .replace(/\\t/g, "\t") // Convert escaped tabs
      .replace(/\\"/g, '"') // Convert escaped quotes
      .replace(/\\\\/g, "\\") // Fix double backslashes
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  } else {
    return text;
  }
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
        _: (value as string)
          .replaceAll(/'/g, "\\'")
          .replaceAll(/"/g, '\\"')
          .replaceAll(/&/g, "&amp;"),
        //language === "fr" ? (value as string).replaceAll(/'/g, "\\'") : value,
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

  printSuccess(`Converted: ${inputPath} → ${outputFilePath}`);
}
