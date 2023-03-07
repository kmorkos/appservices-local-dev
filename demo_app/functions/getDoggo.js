exports = async function(name){
  var serviceName = "mongodb-atlas";

  var dbName = context.values.get("db");
  var collName = context.values.get("coll");

  var collection = context.services.get(serviceName).db(dbName).collection(collName);

  var findResult;
  try {
    findResult = await collection.findOne({ name });

  } catch(err) {
    console.error("Error occurred while executing findOne:", err.message);
    return { error: err.message };
  }

  return { result: findResult };
};