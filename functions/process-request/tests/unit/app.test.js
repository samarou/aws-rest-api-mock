const {describe, it} = require("mocha");
const assert = require("assert");
const mockery = require("mockery");
const sinon = require("sinon");
const YAML = require("yaml")
const {readFileSync} = require("fs");

const customMappingsService = {};
const logService = {};

mockery.enable({warnOnUnregistered: false});
mockery.registerMock("/opt/commons/custom-mappings-service", customMappingsService);
mockery.registerMock("/opt/commons/log-service", logService);
mockery.registerMock("/opt/commons/mappings-validator", require("../../../../layer/commons/mappings-validator"));
mockery.registerMock("/opt/commons/http-utils", require("../../../../layer/commons/http-utils"));

const app = require("../../app");
const defaultMappingsService = require("../../default-mappings-service");

defaultMappingsService.getDefaultMappings = () => {
    return YAML.parse(readFileSync(`${__dirname}/mappings.yaml`, "utf8")).mappings;
};

describe("Test request processing", async () => {

    it("Test failure when no mappings found", async () => {
        const response = await app.lambdaHandler(createRequestEvent("GET", "/someNotMapperUrl"));
        assert.deepStrictEqual(response, {
            statusCode: 404,
            headers: {"Content-Type": "text/plain"},
            body: "Mapping not found"
        });
    });

    it("Test failure when more than one equivalent mapping found", async () => {
        const response = await app.lambdaHandler(createRequestEvent(null, "/testMappingDuplication"));
        assert.deepStrictEqual(response, {
            statusCode: 422,
            headers: {"Content-Type": "text/plain"},
            body: "More than one equivalent mapping found: [\"testDuplication2\",\"testDuplication1\"]"
        });
    });

    it("Test mapping to static path/method/body with returning status/headers/json", async () => {
        const response = await app.lambdaHandler(createRequestEvent("GET", "/testStaticPathAndMethodAndBody", "Test body"));
        assert.deepStrictEqual(response, {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
                "test-header": "testHeaderValue"
            },
            body: "{ \"Result\": \"TEST\" }"
        });
    });

    it("Test mapping to path matching Regex expression", async () => {
        const response = await app.lambdaHandler(createRequestEvent("POST", "/mapPathMatchesRegex", ""));
        assert.deepStrictEqual(response, {statusCode: 200, body: "mapPathMatchesRegex"});
    });

    it("Test mapping to body matching Regex expression", async () => {
        const response = await app.lambdaHandler(createRequestEvent("POST", "/", "bodyMatchesRegex132"));
        assert.deepStrictEqual(response, {statusCode: 200, body: "bodyMatchesRegex"});
    });

    it("Test mapping to body matching JSON path when no content type", async () => {
        const body = JSON.stringify({items: [{key1: 1}, {key2: 2}]}); // $.items[?(!@.key1)]
        const response = await app.lambdaHandler(createRequestEvent("POST", "/bodyMatchesJsonPath1", body));
        assert.deepStrictEqual(response, {statusCode: 200, body: "bodyMatchesJsonPath1"});
    });

    it("Test mapping to body matching JSON path when no content type", async () => {
        const body = JSON.stringify({items: [{num: 10}]}) // $.items[?(@.num>9)]
        const response = await app.lambdaHandler(createRequestEvent("POST", "/bodyMatchesJsonPath2", body));
        assert.deepStrictEqual(response, {statusCode: 200, body: "bodyMatchesJsonPath2"});
    });

    it("Test mapping to body matching JSON path when no content type", async () => {
        const response = await app.lambdaHandler(createRequestEvent("POST", "/bodyMatchesJsonPath3",
            "Text body", {"Content-type": "plain/text"}));
        assert.equal(response.statusCode, 404);
    });

    it("Test mapping to multiple HTTP methods: GET", async () => {
        const response = await app.lambdaHandler(createRequestEvent("GET", "/mapMultipleMethods"));
        assert.deepStrictEqual(response, {statusCode: 200, body: "mapMultipleMethods"});
    });

    it("Test mapping to multiple HTTP methods: PUT", async () => {
        const response = await app.lambdaHandler(createRequestEvent("PUT", "/mapMultipleMethods"));
        assert.deepStrictEqual(response, {statusCode: 200, body: "mapMultipleMethods"});
    });

    it("Test mapping to multiple HTTP methods: POST", async () => {
        const response = await app.lambdaHandler(createRequestEvent("POST", "/mapMultipleMethods"));
        assert.deepStrictEqual(response, {statusCode: 200, body: "mapMultipleMethods"});
    });

    it("Test mapping to static header ane header matching JSON", async () => {
        const headers = {
            "test-header1": "header1_value",
            "test-header2": "header2_value",
            "test-header3": "header3_value",
        };
        const response = await app.lambdaHandler(createRequestEvent("XXX",
            "/mapHeaderStaticAndMatchesRegex", "", headers));
        assert.deepStrictEqual(response, {statusCode: 200, body: "mapHeaderStaticAndMatchesRegex"});
    });

    it("Test equivalent mappings with different priorities defined", async () => {
        const response = await app.lambdaHandler(createRequestEvent("POST", "/testPriority"));
        assert.deepStrictEqual(response, {statusCode: 200, body: "testPriority3"});
    });

    it("Test expression resolution", async () => {
        const body = JSON.stringify({
            items: [{prop: "testVal"}]
        });
        const response = await app.lambdaHandler(createRequestEvent("POST", "/testExpressions", body));
        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.headers, {"response-header": "/testExpressions"});
        // POST  2023-05-25T20:20:36Z20:20:36 87013  pwr6l  17c87c93-d453-41a4-b268-7235e38804d8  testVal
        assert.match(response.body, /^POST \n\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n\d{2}:\d{2}:\d{2}\n\d{5} \n\w{5} \n\w{8}-\w{4}-\w{4}-\w{4}-\w{12}\ntestVal\n$/);
    });

    it("Test when no correlation id then custom mappings are not used and request/response is not logged", async () => {
        customMappingsService.getCustomMappings = sinon.stub();
        logService.createLogEntry = sinon.stub();
        await app.lambdaHandler(createRequestEvent("POST", "/mapPathMatchesRegex", ""));
        sinon.assert.notCalled(customMappingsService.getCustomMappings);
        sinon.assert.notCalled(logService.createLogEntry);
    });

    it("Test failure when no corresponding custom mappings found for correlatio id", async () => {
        const correlationId = "123asd";
        customMappingsService.getCustomMappings = sinon.stub().returns([]);
        logService.createLogEntry = sinon.stub();
        const response = await app.lambdaHandler(createRequestEvent("POST", "/mapPathMatchesRegex", "",
            {"correlation-id": correlationId}));
        assert.deepStrictEqual(response, {
            statusCode: 404,
            headers: {"Content-Type": "text/plain"},
            body: "Mapping not found"
        });
        sinon.assert.calledOnceWithExactly(customMappingsService.getCustomMappings, correlationId);
        sinon.assert.notCalled(logService.createLogEntry);
    });

    it("Test using custom mappings for correlation id", async () => {
        const correlationId = "123asd";
        const customMapping1 = {
            "id": "customMapping1",
            "request": {"method": "GET"}
        };
        const customMapping2 = {
            "id": "customMapping2",
            "request": {"path": "/testCustomMappings", "method": "POST"},
            "response": {"status": 200, "body": "testCustomMappingsBody"}
        };
        customMappingsService.getCustomMappings = sinon.stub().returns([customMapping1, customMapping2]);
        logService.createLogEntry = sinon.stub();
        const response = await app.lambdaHandler(createRequestEvent("POST", "/testCustomMappings", null,
            {"correlation-id": correlationId}));
        assert.deepStrictEqual(response, {statusCode: 200, body: "testCustomMappingsBody"});
        sinon.assert.calledOnceWithExactly(customMappingsService.getCustomMappings, correlationId);
        sinon.assert.calledOnceWithExactly(logService.createLogEntry,
            correlationId,
            "customMapping2",
            {
                path: "/testCustomMappings",
                method: 'POST',
                headers: {"correlation-id": "123asd"},
                body: null
            },
            {
                statusCode: 200,
                body: 'testCustomMappingsBody'
            }
        );
    });
});

function createRequestEvent(method, path, body, headers) {
    return {
        rawPath: path,
        requestContext: {
            http: {
                method: method
            }
        },
        headers,
        body
    };
}

