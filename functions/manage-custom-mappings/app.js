const customMappingsService = require("/opt/commons/custom-mappings-service");
const httpUtils = require("/opt/commons/http-utils");

exports.lambdaHandler = async (event) => {
    try {
        console.log("Event:", event);
        const correlationId = event.pathParameters.correlationId;
        const mappingId = event.pathParameters.mappingId;
        const requestMethod = event.requestContext.http.method;
        if (requestMethod === "GET") {
            const mappings = await customMappingsService.getCustomMappings(correlationId);
            return httpUtils.createSuccessResponse({mappings});
        } else if (requestMethod === "POST") {
            const mappingsObject = JSON.parse(event.body)
            await customMappingsService.addCustomMappings(correlationId, mappingsObject);
            return httpUtils.createSuccessResponse(mappingsObject.mappings.length + " mappings added");
        } else if (requestMethod === "DELETE") {
            await customMappingsService.deleteCustomMapping(correlationId, mappingId);
            return httpUtils.createSuccessResponse("Mapping deleted");
        }
    } catch (e) {
        console.log(e);
        return httpUtils.createErrorResponse(e)
    }
}