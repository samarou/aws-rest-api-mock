const fetchAllPagesForQuery = async (documentClient, queryParams) => {
    let result = [];
    let queryResponse = await documentClient.query(queryParams).promise();
    result.push(...extractItemsForQuery(queryResponse));
    while (queryResponse.LastEvaluatedKey) {
        queryResponse = await documentClient.query({
            ...queryParams,
            ExclusiveStartKey: queryResponse.LastEvaluatedKey
        }).promise();
        result.push(...extractItemsForQuery(queryResponse));
    }
    return result;
};

const extractItemsForQuery = queryResponse => queryResponse?.Items || [];

module.exports = {
    fetchAllPagesForQuery
};