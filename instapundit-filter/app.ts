import axios from 'axios';
import { APIGatewayProxyResult } from 'aws-lambda';
import { parseStringPromise, Builder } from 'xml2js';

const FEED_URL = 'https://instapundit.com/feed/';
const AUTHOR_NAME = 'Glenn Reynolds';

/**
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
    try {
        // Fetch the RSS feed
        const response = await axios.get(FEED_URL);
        const xmlData = response.data;

        // Parse the XML
        const result = await parseStringPromise(xmlData);

        // Filter the items
        const filteredItems = result.rss.channel[0].item.filter((item: any) => {
            return item['dc:creator'] && item['dc:creator'][0] === AUTHOR_NAME;
        });

        // Reconstruct the RSS feed with filtered items
        result.rss.channel[0].item = filteredItems;

        // Convert back to XML
        const builder = new Builder();
        const filteredXml = builder.buildObject(result);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/rss+xml',
            },
            body: filteredXml,
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            }),
        };
    }
};
