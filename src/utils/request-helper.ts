import axios from "axios";
import {
  printError,
  printInfo,
  showProgress,
  stopProgress,
} from "./console-print";

type ConfigValues = {
  body: any;
  params?: any;
  url: string;
  method: string;
  headers: any;
};

export const createRequest = async (
  config: ConfigValues,
  retries: number = 3
) => {
  showProgress(
    `Translating file ID ${config.body.id} (${3 - retries + 1}/3)...`
  );
  try {
    const response = await axios({
      url: config.url,
      method: config.method,
      data: config.body,
      headers: config.headers,
      params: config.params,
      responseType: "json",
      timeout: 60000 * 5, // 5 mins
    });

    return response.data;
  } catch (e) {
    if (retries - 1 > 0) {
      if (axios.isAxiosError(e) && e.code === "ECONNABORTED") {
        printError(
          `Request timed out..\nRetrying request after 1 second...(${
            retries - 1
          } retries left)`
        );
      }

      stopProgress(`Retrying request...`, false);
      await createRequest(config, retries - 1);
    } else {
      stopProgress(`Failed to translate file..`, false);
      return null;
    }
  }
};

export async function processApiCallsInBatches(
  apiCalls: (() => Promise<any>)[],
  batchSize: number = 50
) {
  const results: any[] = [];

  for (let i = 0; i < apiCalls.length; i += batchSize) {
    const batch = apiCalls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((call) => call()));
    results.push(...batchResults);
  }

  return results.reduce((acc, result) => ({ ...acc, ...result }), {});
}
