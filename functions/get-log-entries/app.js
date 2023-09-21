const logService = require("/opt/commons/log-service");
const httpUtils = require("/opt/commons/http-utils");

exports.lambdaHandler = async (event) => {
    try {
        console.log("Event:", event);
        const correlationId = event.pathParameters.correlationId;
        const logEntries = await logService.getLogEntries(correlationId);
        const responseLogEntries = logEntries.map(e => ({
            timestamp: e.timestamp,
            request: e.request,
            response: e.response
        }));
        return httpUtils.createSuccessResponse({entries: responseLogEntries});
    } catch (e) {
        console.log(e);
        return httpUtils.createErrorResponse(e)
    }
}