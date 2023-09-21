const YAML = require("yaml")
const {readFileSync} = require("fs");
const {resolve} = require("path")
const mappingsValidator = require("/opt/commons/mappings-validator");

let defaultMappings;

const getDefaultMappings = () => {
    if (!defaultMappings) {
        const mappingsConfigPath = resolve(__dirname, "resources", "mappings.yaml");
        const mappingsConfig = YAML.parse(readFileSync(mappingsConfigPath, "utf8"));
        mappingsValidator.validate(mappingsConfig);
        defaultMappings = mappingsConfig.mappings;
    }
    return defaultMappings;
};

module.exports = {
    getDefaultMappings
};