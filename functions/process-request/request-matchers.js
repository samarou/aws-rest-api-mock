const {JSONPath} = require("jsonpath-plus");
const utils = require("./utils");

class RequestMatcher {

    constructor(mapping) {
        this.mapping = mapping;
    }

    matches = () => {
        throw new Error("Function not implemented");
    };
}

class PathMatcher extends RequestMatcher {
    matches = (request) => {
        const mappingPath = this.mapping.request.path;
        if (!mappingPath) {
            return true;
        }
        if (mappingPath.matchesRegex) {
            const regexp = new RegExp(mappingPath.matchesRegex);
            return regexp.test(request.path);
        }
        return request.path === mappingPath;
    };
}

class MethodMatcher extends RequestMatcher {
    matches = (request) => {
        const mappingMethod = this.mapping.request.method;
        if (!mappingMethod) {
            return true;
        }
        if (Array.isArray(mappingMethod)) {
            return mappingMethod.includes(request.method);
        }
        return request.method === mappingMethod;
    };
}

class HeadersMatcher extends RequestMatcher {
    matches = (request) => {
        const mappingHeaders = this.mapping.request.headers;
        if (!mappingHeaders) {
            return true;
        }
        const requestHeaders = request.headers || {};
        return Object.entries(mappingHeaders).every(([header, mappingValue]) => {
            // aws gateway always provides header names in lower case
            const requestValue = requestHeaders[header.toLowerCase()];
            if (requestValue === mappingValue) {
                return true;
            } else if (requestValue && mappingValue.matchesRegex) {
                const regexp = new RegExp(mappingValue.matchesRegex);
                return regexp.test(requestValue);
            }
            return false
        });
    };
}

class BodyMatcher extends RequestMatcher {
    matches = (request) => {
        const mappingBody = this.mapping.request.body;
        if (!mappingBody) {
            return true;
        }
        if (mappingBody.matchesRegex) {
            const regexp = new RegExp(mappingBody.matchesRegex);
            return regexp.test(request.body);
        } else if (mappingBody.matchesJsonPath) {
            const json = utils.parseRequestBodyJson(request);
            if (json) {
                const pathValues = JSONPath({path: mappingBody.matchesJsonPath, json});
                return pathValues && pathValues.length > 0;
            }
            return false;
        } else if (request.body === mappingBody) {
            return true;
        }
        return false;
    };
}

module.exports = Object.freeze({
    PathMatcher,
    MethodMatcher,
    HeadersMatcher,
    BodyMatcher
});