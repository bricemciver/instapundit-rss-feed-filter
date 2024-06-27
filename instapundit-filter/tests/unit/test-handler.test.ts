import { APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { expect, describe, it } from '@jest/globals';

describe('Unit test for app handler', function () {
    it('verifies successful response', async () => {
        const result: APIGatewayProxyResult = await lambdaHandler();

        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toBeGreaterThan(0);
    });
});
