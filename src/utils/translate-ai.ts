import { createRequest } from "./request-helper";
import { v4 as uuidv4 } from "uuid";

export const translateRequest = async (
  data: any,
  lang: string,
  uuid: string
) => {
  const response = await createRequest({
    url: "https://dev-translator-app.azurewebsites.net/api/translate?code=NancxpqqpI3yM7lCSONa0AOxsS_kGl2b3NcTV8yzmmvNAzFut10iYQ%3D%3D",
    method: "POST",
    params: {
      code: "NancxpqqpI3yM7lCSONa0AOxsS_kGl2b3NcTV8yzmmvNAzFut10iYQ%3D%3D",
    },
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
