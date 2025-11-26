import { describe, expect, it } from "@jest/globals";
import type { APIGatewayProxyResult } from "aws-lambda";
import { lambdaHandler } from "../../app";

describe("Unit test for app handler", () => {
	it("verifies successful response", async () => {
		const result: APIGatewayProxyResult = await lambdaHandler();

		expect(result.statusCode).toEqual(200);
		expect(result.body.length).toBeGreaterThan(0);
	});
});
