import { Handler, ProxyResult } from "aws-lambda";
import axios from "axios";

import { parseStringPromise, Builder } from "xml2js";

const FEED_URL = "http://feeds.feedburner.com/pjmedia/instapundit";
const AUTHOR_NAME = "Glenn Reynolds";

export const feed: Handler<void, ProxyResult> = async () => {
  try {
    const resp = await axios.get(FEED_URL);
    const feedXml = await parseStringPromise(resp.data);
    const items = feedXml.rss.channel[0].item.filter(
      (item: any) => item["dc:creator"][0] === AUTHOR_NAME,
    );
    feedXml.rss.channel[0].item = items;
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/rss+xml",
      },
      body: new Builder().buildObject(feedXml),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body:
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Unknown Error",
    };
  }
};
