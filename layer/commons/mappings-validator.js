const Ajv = require("ajv");
const YAML = require("yaml")
const {resolve} = require("path");
const {readFileSync} = require("fs");

let validator;

function validate(mappingsObject) {
    const errors = [];
    const validator = getValidator();
    const valid = validator(mappingsObject);
    if (!valid) {
        errors.push(validator.errors.map(e => `'${e.instancePath}': ${e.message}`));
    } else {
        const mappings = mappingsObject.mappings;
        const uniqueIds = new Set(mappings.map(m => m.id));
        if (uniqueIds.size !== mappings.length) {
            errors.push("Mapping ids must be unique");
        }
    }
    if (errors.length > 0) {
        throw new Error("Errors found in mappings:\n"
            + errors.map(e => '- ' + e).join("\n"));
    }
}

function getValidator() {
    if (!validator) {
        const schemaFilePath = resolve(__dirname, "resources", "mappings-schema.yaml");
        const schema = YAML.parse(readFileSync(schemaFilePath, "utf8"));
        const ajv = new Ajv({allErrors: true})
        validator = ajv.compile(schema);
    }
    return validator;
}

module.exports = {
    validate
};