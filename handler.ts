import { Handler } from "aws-lambda";
import * as http from "node:http";

import { parseStringPromise, Builder } from "xml2js";

export const feed: Handler = () => {
  return new Promise((resolve, reject) => {
    http
      .get("http://feeds.feedburner.com/pjmedia/instapundit", (resp) => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on("end", async () => {
          // filter out unwanted items
          const xml = await parseStringPromise(data);
          const items = xml.rss.channel[0].item.filter(
            (item: any) => item["dc:creator"][0] === "Glenn Reynolds"
          );
          xml.rss.channel[0].item = items;

          resolve({
            statusCode: 200,
            headers: {
              "Content-Type": "application/rss+xml",
            },
            body: new Builder().buildObject(xml),
          });
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};
