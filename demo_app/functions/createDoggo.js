exports = async function (name, breed, age) {
  var serviceName = "mongodb-atlas";

  var dbName = context.values.get("db");
  var collName = context.values.get("coll");

  // Get a collection from the context
  var collection = context.services
    .get(serviceName)
    .db(dbName)
    .collection(collName);

  try {
    await collection.insertOne({ name, breed, age });
  } catch (err) {
    console.error("Error occurred while executing insertOne:", err.message);
    return { error: err.message };
  }
};
