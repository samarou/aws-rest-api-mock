const requestMatchers = require("./request-matchers");
const expressionResolver = require("./expression-resolver");
const defaultMappingsService = require("./default-mappings-service");
const customMappingsService = require("/opt/commons/custom-mappings-service");
const logService = require("/opt/commons/log-service");
const httpUtils = require("/opt/commons/http-utils");

exports.lambdaHandler = async (event) => {
    try {
        console.log("Event:", event);
        const request = getRequestParameters(event);
        const response = await executeMapping(request);
        console.log("Response:", response)
        return response;
    } catch (e) {
        console.log(e);
        return httpUtils.createErrorResponse(e)
    }
}

async function executeMapping(request) {
    const requestMapping = await getRequestMapping(request);
    const mappedResponse = requestMapping.response;
    const response = {statusCode: mappedResponse.status || 200};
    if (mappedResponse.body) {
        response.body = resolveExprs(mappedResponse.body, request);
    }
    if (mappedResponse.headers) {
        response.headers = Object.fromEntries(Object.entries(mappedResponse.headers)
            .map(([k, v]) => [k, resolveExprs(v, request)]));
    }
    const correlationId = getCorrelationId(request);
    if (correlationId) {
        await logService.createLogEntry(correlationId, requestMapping.id, request, response)
    }
    return response;
}

async function getRequestMapping(request) {
    const correlationId = getCorrelationId(request);
    const mappings = correlationId ?
        await customMappingsService.getCustomMappings(correlationId) :
        defaultMappingsService.getDefaultMappings();
    const requestMappings = findRequestMappings(mappings, request);
    if (requestMappings.length === 0) {
        throw createError(404, "Mapping not found");
    }
    if (requestMappings.length > 1) {
        requestMappings.sort((m1, m2) => (m2.priority - m1.priority) || Number.MIN_SAFE_INTEGER);
        if (requestMappings[0].priority === requestMappings[1].priority) {
            const duplicateMappingIds = JSON.stringify(requestMappings.map(rm => rm.id));
            throw createError(422, "More than one equivalent mapping found: " + duplicateMappingIds);
        }
    }
    return requestMappings[0];
}

function findRequestMappings(mappings, request) {
    const foundMappings = [];
    for (const mapping of mappings) {
        if (requestMatches(request, mapping)) {
            foundMappings.push(mapping);
        }
    }
    return foundMappings;
}

function requestMatches(request, mapping) {
    return Object.values(requestMatchers)
        .map(Matcher => new Matcher(mapping))
        .every(matcher => matcher.matches(request));
}

function getRequestParameters(event) {
    let requestPath = event.rawPath;
    if (event.rawQueryString) {
        requestPath += "?" + event.rawQueryString;
    }
    const httpMethod = event.requestContext.http.method;
    const requestBody = getRequestBodyDecoded(event);
    return {
        path: requestPath,
        method: httpMethod,
        headers: event.headers,
        body: requestBody
    };
}

function getRequestBodyDecoded(event) {
    if (event.isBase64Encoded) {
        return Buffer.from(event.body, "base64").toString("utf8");
    }
    return event.body;
}

function resolveExprs(value, request) {
    return expressionResolver.resolve(value, {request});
}

function getCorrelationId(request) {
    return request.headers?.["correlation-id"];
}

function createError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}