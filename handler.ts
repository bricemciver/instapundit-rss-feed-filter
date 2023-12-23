import { Handler } from "aws-lambda";
import * as http from "node:http";

import { parseStringPromise, Builder } from "xml2js";

const FEED_URL = "http://feeds.feedburner.com/pjmedia/instapundit";

const getFeed = async () => {
  return new Promise<string>((resolve, reject) => {
    const req = http.get(FEED_URL, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error("Status Code error"));
      }

      const body: Uint8Array[] = [];

      res.on("data", (chunk) => body.push(chunk));

      res.on("end", () => {
        const resString = Buffer.concat(body).toString();
        resolve(resString);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
};

const parseXml = async (xmlString: string) => {
  return new Promise((resolve, reject) => {
    parseStringPromise(xmlString)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// filter items by creator
const filterXml = async (data) => {
  const items = data.rss.channel[0].item.filter(
    (item: any) => item["dc:creator"][0] === "Glenn Reynolds",
  );
  data.rss.channel[0].item = items;
  return data;
};

const buildOutput = async (parsedXml) => {
  return new Promise<string>((resolve) => {
    const builder = new Builder();

    const xmlString = builder.buildObject(parsedXml);

    resolve(xmlString);
  });
};

export const feed: Handler = async () => {
  try {
    const response = await getFeed();
    const feedXml = await parseXml(response);
    const filteredXml = await filterXml(feedXml);
    const output = await buildOutput(filteredXml);

    return {
      statusCode: 200,
      body: output,
    };
  } catch (err) {
    // handle errors
    return {
      statusCode: 500,
      body: err,
    };
  }
};
