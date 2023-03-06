import { pluginTester } from "babel-plugin-tester";
import appservicesContextTransformer from "../index";

pluginTester({
  plugin: appservicesContextTransformer,
  pluginOptions: {
    values: {
      'foo': 'bar',
      'bizz': 'buzz'
    },
  },
  tests: {
    'one liner': {
      code: `const val = context.values.get("foo");`,
      output: `const val = "bar";`,
    },
    'two lines': {
      code: `
const values = context.values;
const val = values.get("foo");`,
      output: `
const values = context.values;
const val = "bar";`,
    },
    'three lines': {
      code: `
const ctx = context;
const values = ctx.values;
const val = values.get("foo");`,
      output: `
const ctx = context;
const values = ctx.values;
const val = "bar";`,
    },
    'multiple values': {
      code: `
const val1 = context.values.get("foo");
const val2 = context.values.get("bizz");`,
      output: `
const val1 = "bar";
const val2 = "buzz";`,
    },
    'non values object': {
      code: `const unrelated = myObj.get("foo");`,
    },
    'non context object': {
      code: `const unrelated = myObj.values.get("foo");`,
    },
    'redefined context': {
      code: `
const context = myNewContext();
const unrelated = context.values.get("foo");`,
    },
    'unknown values': {
      code: `const val = context.values.get("baz");`,
      throws: 'Could not find mapping for baz value',
    },
    'invalid arg type': {
      code: `const val = context.values.get(100);`,
      throws: 'Expected StringLiteral argument, but found NumericLiteral',
    },
    'too many args': {
      code: `const val = context.values.get("foo", "bizz");`,
      throws: 'Expected exactly one argument, but found 2',
    },
    'no args': {
      code: `const val = context.services.get();`,
      throws: 'Expected exactly one argument, but found 0',
    },
  },
});
