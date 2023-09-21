const Handlebars = require("handlebars");
const {JSONPath} = require("jsonpath-plus");
const {v4: uuidv4} = require('uuid');
const moment = require("moment");
const utils = require("./utils");

const handlebars = Handlebars.create();

const resolve = (value, context) => {
    if (typeof value !== "string"
        || !value.includes("{{")
        || !value.includes("}}")) {
        return value;
    }
    const template = handlebars.compile(value);
    return template({env: process.env, ...context});
}

handlebars.registerHelper("now", (options) => {
    const format = getParams(options).format;
    return moment().utc().format(format);
});

handlebars.registerHelper("random", (options) => {
    const type = getParams(options).type || "string";
    const length = getParams(options).length || 10;
    if (type === "number") {
        return randomNumber(length);
    } else if (type === "string") {
        return randomString(length);
    } else if (type === "uuid") {
        return uuidv4();
    }
});

handlebars.registerHelper("requestJsonPath", (options) => {
    const path = getParams(options).path || "$";
    const request = getContext(options).request;
    if (request) {
        const json = utils.parseRequestBodyJson(request);
        if (json) {
            const pathValues = JSONPath({path, json});
            if (pathValues && pathValues.length > 0) {
                return pathValues[0];
            }
        }
    }
});

function getParams(options) {
    return options?.hash || {};
}

function getContext(options) {
    return options?.data?.root || {};
}

function randomNumber(length) {
    const start = Math.pow(10, length - 1);
    return Math.floor(start + Math.random() * (start * 10 - start - 1));
}

function randomString(length) {
    return Array(length).fill().map(() => (Math.random() * 36 | 0).toString(36)).join('');
}

module.exports = Object.freeze({
    resolve
});