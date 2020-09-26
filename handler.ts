import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';
import { parseStringPromise, Builder } from 'xml2js';
import 'source-map-support/register';

export const feed: APIGatewayProxyHandler = async (_event, _context) => {
  const response = await axios.get(
    "http://feeds.feedburner.com/pjmedia/instapundit"
  );
  // filter out unwanted items
  const xml = await parseStringPromise(response.data);
  const items = xml.rss.channel[0].item.filter(
    (item: any) => item["dc:creator"][0] === "Glenn Reynolds"
  );
  xml.rss.channel[0].item = items;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/rss+xml",
    },
    body: new Builder().buildObject(xml),
  };
}
