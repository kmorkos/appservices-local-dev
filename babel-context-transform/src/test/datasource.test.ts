import { pluginTester } from "babel-plugin-tester";
import appservicesContextTransformer from "../index";

pluginTester({
  plugin: appservicesContextTransformer,
  pluginOptions: {
    datasources: {
      'mongodb-atlas': 'mongodb://localhost:27017',
      'mongodb-atlas-2': 'mongodb://localhost:26000'
    },
  },
  tests: {
    'one liner': {
      code: `const db = context.services.get("mongodb-atlas").db("test");`,
      output: `
import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient];
const db = _mongoClient.db("test");`,
    },
    'two lines': {
      code: `
const mongoClient = context.services.get("mongodb-atlas");
const db = mongoClient.db("test");`,
      output: `
import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient];
const mongoClient = _mongoClient;
const db = mongoClient.db("test");`,
    },
    'three lines': {
      code: `
const services = context.services;
const mongoClient = services.get("mongodb-atlas");
const db = mongoClient.db("test");`,
      output: `
import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient];
const services = context.services;
const mongoClient = _mongoClient;
const db = mongoClient.db("test");`,
    },
    'four lines': {
      code: `
const ctx = context;
const services = ctx.services;
const mongoClient = services.get("mongodb-atlas");
const db = mongoClient.db("test");`,
      output: `
import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient];
const ctx = context;
const services = ctx.services;
const mongoClient = _mongoClient;
const db = mongoClient.db("test");`,
    },
    'multiple datasources': {
      code: `
const ds1 = context.services.get("mongodb-atlas");
const ds2 = context.services.get("mongodb-atlas-2");`,
      output: `
import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient2 = new _MongoClient("mongodb://localhost:26000");
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient, _mongoClient2];
const ds1 = _mongoClient;
const ds2 = _mongoClient2;`,
    },
    'service name from variable': {
      code: `
const serviceName = "mongodb-atlas";
const mongoClient = context.services.get(serviceName);`,
      output: `
import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient];
const serviceName = "mongodb-atlas";
const mongoClient = _mongoClient;`,
    },
    'non services object': {
      code: `const unrelated = myObj.get("mongodb-atlas");`,
    },
    'non context object': {
      code: `const unrelated = myObj.services.get("mongodb-atlas");`,
    },
    'redefined context': {
      code: `
const context = myNewContext();
const unrelated = context.services.get("mongodb-atlas");`,
    },
    'unknown data source': {
      code: `
const mongoClient = context.services.get("unknown-service");
const db = mongoClient.db("test");`,
      throws: 'Could not find mapping for unknown-service data source',
    },
    'invalid arg type': {
      code: `
const mongoClient = context.services.get(100);
const db = mongoClient.db("test");`,
      throws: 'Expected string argument, but found NumericLiteral',
    },
    'too many args': {
      code: `
const mongoClient = context.services.get("mongodb-atlas", "mongodb-atlas");
const db = mongoClient.db("test");`,
      throws: 'Expected exactly one argument, but found 2',
    },
    'no args': {
      code: `
const mongoClient = context.services.get();
const db = mongoClient.db("test");`,
      throws: 'Expected exactly one argument, but found 0',
    },
  },
});
