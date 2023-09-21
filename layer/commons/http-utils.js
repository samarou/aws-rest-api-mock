const createResponse = (statusCode, body, headers) => {
    let contentType;
    if (typeof body === 'string') {
        contentType = "text/plain";
    } else {
        contentType = "application/json";
        body = JSON.stringify(body);
    }
    return {
        statusCode,
        headers: {"Content-Type": contentType, ...headers},
        body
    };
};

const createSuccessResponse = (body, headers) => {
    return createResponse(200, body, headers);
};

const createErrorResponse = (error, serverErrorMessage) => {
    let statusCode = error.code || 500;
    let body = error.message || error;

    if (error.response?.status) {
        statusCode = error.response.status;
        body = error.response.data;
    }

    if (statusCode === 500 && serverErrorMessage) {
        body = serverErrorMessage;
    }

    return createResponse(statusCode, body);
};

module.exports = Object.freeze({
    createResponse,
    createSuccessResponse,
    createErrorResponse
});