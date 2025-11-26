import {
  GetParametersCommand,
  type Parameter,
  SSMClient,
} from "@aws-sdk/client-ssm";
import type { APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { Builder, parseStringPromise } from "xml2js";

interface RssItem {
  "dc:creator"?: string[];
  [key: string]: unknown;
}

interface RssChannel {
  item: RssItem[];
  [key: string]: unknown;
}

interface RssRoot {
  rss: {
    channel: RssChannel[];
    [key: string]: unknown;
  };
}

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Default values in case SSM parameters are not found
const DEFAULT_FEED_URL = "https://instapundit.com/feed/";
const DEFAULT_AUTHOR_NAME = "Glenn Reynolds";

interface ConfigParameters {
  feedUrl: string;
  authorName: string;
}

async function getSSMParameters(): Promise<ConfigParameters> {
  try {
    const command = new GetParametersCommand({
      Names: [
        "/instapundit-filter/feed-url",
        "/instapundit-filter/author-name",
      ],
      WithDecryption: false,
    });

    const response = await ssmClient.send(command);

    const params = response.Parameters?.reduce<Record<string, string>>(
      (acc: Record<string, string>, param: Parameter) => {
        if (param.Name && param.Value) {
          const key = param.Name.split("/").pop() || "";
          acc[key] = param.Value;
        }
        return acc;
      },
      {}
    );

    return {
      feedUrl: params?.["feed-url"] || process.env.FEED_URL || DEFAULT_FEED_URL,
      authorName:
        params?.["author-name"] ||
        process.env.AUTHOR_NAME ||
        DEFAULT_AUTHOR_NAME,
    };
  } catch (error) {
    console.error("Error fetching parameters from SSM:", error);
    return {
      feedUrl: process.env.FEED_URL || DEFAULT_FEED_URL,
      authorName: process.env.AUTHOR_NAME || DEFAULT_AUTHOR_NAME,
    };
  }
}

/**
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
  try {
    // Get configuration from SSM
    const { feedUrl, authorName } = await getSSMParameters();

    // Fetch the RSS feed
    const response = await axios.get(feedUrl);
    const xmlData = response.data;

    // Parse the XML
    const result = await parseStringPromise(xmlData);

    // Filter the items
    const rssData = result as RssRoot;
    const channel = rssData.rss.channel[0];
    const filteredItems = channel.item.filter((item: RssItem) => {
      return item["dc:creator"] && item["dc:creator"][0] === authorName;
    });

    // Reconstruct the RSS feed with filtered items
    channel.item = filteredItems;

    // Convert back to XML
    const builder = new Builder();
    const filteredXml = builder.buildObject(result);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/rss+xml",
      },
      body: filteredXml,
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};
