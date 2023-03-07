import { pluginTester } from "babel-plugin-tester";
import appservicesContextTransformer from "../index";

pluginTester({
  plugin: appservicesContextTransformer,
  tests: {
    'transform async exports': {
      code: `exports = async function (arg0, arg1) {}`,
      output: `export default (async function (arg0, arg1) {});`,
    },
    'transform sync exports': {
      code: `exports = function (arg0, arg1) {}`,
      output: `export default (function (arg0, arg1) {});`,
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
