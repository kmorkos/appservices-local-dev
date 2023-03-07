import { pluginTester } from "babel-plugin-tester";
import appservicesContextTransformer from "../index";

pluginTester({
  plugin: appservicesContextTransformer,
  pluginOptions: {
    datasources: {
      'mongodb-atlas': 'mongodb://localhost:27017'
    },
  },
  tests: {
    'transform async exports': {
      code: `exports = async function (arg0, arg1) {}`,
      output: `export default (async function (arg0, arg1) {
  try {
  } finally {
  }
});`,
    },
    'transform sync exports': {
      code: `exports = function (arg0, arg1) {}`,
      output: `export default (function (arg0, arg1) {
  try {
  } finally {
  }
});`,
    },
    'transform function using a datasource': {
      code: `exports = async function (arg0, arg1) {
  const db = context.services.get('mongodb-atlas').db("db");
}`,
      output: `import { MongoClient as _MongoClient } from "mongodb";
const _mongoClient = new _MongoClient("mongodb://localhost:27017");
const _mongoClients = [_mongoClient];
export default (async function (arg0, arg1) {
  try {
    const db = _mongoClient.db("db");
  } finally {
    _mongoClients.forEach((mc) => mc.close());
  }
});`,
    },
    'ignores non exported functions': {
      code: `function helper(arg0, arg1) {}`
    },
    'ignores assignment in inner scope': {
      code: `function helper(arg0, arg1) {
  exports = "abc";
}`
    },
  },
});
