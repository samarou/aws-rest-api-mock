const dbUtils = require("./dynamodb-utils");
const mappingsValidator = require("./mappings-validator");
const DynamoDB = require("aws-sdk/clients/dynamodb");

const documentClient = new DynamoDB.DocumentClient();

const CUSTOM_MAPPING_TTL = 60 * 60; // 1hr

const getCustomMappings = async (correlationId) => {
    const items = await dbUtils.fetchAllPagesForQuery(documentClient, {
        TableName: getCustomMappingTableName(),
        KeyConditionExpression: 'correlationId = :correlationId',
        ExpressionAttributeValues: {
            ':correlationId': correlationId
        }
    });
    return items.map(item => item.mapping);
};

const addCustomMappings = async (correlationId, mappingsObject) => {
    mappingsValidator.validate(mappingsObject);
    const ttl = Math.round(Date.now() / 1000) + CUSTOM_MAPPING_TTL;
    const dbBatchItems = mappingsObject.mappings.map(mapping => ({
        PutRequest: {
            Item: {
                correlationId,
                mappingId: mapping.id,
                mapping,
                ttl
            }
        }
    }));
    const params = {RequestItems: {[getCustomMappingTableName()]: dbBatchItems}};
    await documentClient.batchWrite(params).promise();
};

const deleteCustomMapping = async (correlationId, mappingId) => {
    await documentClient.delete({
        TableName: getCustomMappingTableName(),
        Key: {correlationId, mappingId}
    }).promise();
};

function getCustomMappingTableName() {
    return process.env.CustomMappingTableName;
}

module.exports = {
    getCustomMappings,
    addCustomMappings,
    deleteCustomMapping
};