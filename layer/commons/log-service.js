const dbUtils = require("./dynamodb-utils");
const DynamoDB = require("aws-sdk/clients/dynamodb");

const documentClient = new DynamoDB.DocumentClient();

const LOG_ENTRY_TTL = 24 * 60 * 60; // day

const getLogEntries = async (correlationId) => {
    return await dbUtils.fetchAllPagesForQuery(documentClient, {
        TableName: getLogTableName(),
        KeyConditionExpression: 'correlationId = :correlationId',
        ExpressionAttributeValues: {
            ':correlationId': correlationId
        }
    });
};

const createLogEntry = async (correlationId, mappingId, request, response) => {
    const now = new Date();
    const ttl = Math.round(now.getTime() / 1000) + LOG_ENTRY_TTL;
    const timestamp = getLogTimestamp(now);
    await documentClient.put({
        TableName: getLogTableName(),
        Item: {
            correlationId,
            timestamp,
            mappingId,
            request,
            response,
            ttl
        }
    }).promise();
};

function getLogTimestamp(now) {
    return now.toISOString().replace(/[^0-9]/g, "")
        + Math.floor(Math.random() * 1000);
}

function getLogTableName() {
    return process.env.LogTableName;
}

module.exports = {
    getLogEntries,
    createLogEntry
};