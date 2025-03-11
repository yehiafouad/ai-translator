import { createRequest } from "./request-helper";

export const translateRequest = async (
  data: any,
  lang: string,
  uuid: string
) => {
  const response = await createRequest({
    url: process.env.AI_TRANSLATE_ENDPOINT as string,
    method: "POST",
    body: {
      id: uuid,
      data,
      language: lang,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response?.translated_data || response;
};
