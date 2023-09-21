const parseRequestBodyJson = request => {
    if (request.parsedBodyJson === undefined) {
        if (!isJsonConsideredContentType(request)) {
            request.parsedBodyJson = null;
        } else {
            try {
                request.parsedBodyJson = JSON.parse(request.body);
            } catch (e) {
                // body is not valid JSON
                request.parsedBodyJson = null;
            }
        }
    }
    return request.parsedBodyJson;
};

function isJsonConsideredContentType(request) {
    let contentType;
    const headers = request.headers;
    if (headers) {
        contentType = Object.keys(headers)
            .filter(headerName => headerName.toLowerCase() === "content-type")
            .map(headerName => headers[headerName])[0];
    }
    return !contentType || contentType.startsWith("application/json");
}

module.exports = Object.freeze({
    parseRequestBodyJson
});