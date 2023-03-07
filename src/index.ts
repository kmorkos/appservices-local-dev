import * as BabelCoreNamespace from '@babel/core';
import { Node, PluginObj } from '@babel/core';
import { addNamed } from "@babel/helper-module-imports";
import { Scope } from '@babel/traverse';
import { BlockStatement } from '@babel/types';

const resolveIdentifier = (node: Node, scope: Scope): Node => {
  if (node.type !== 'Identifier') {
    return node;
  }

  const binding = scope.getBinding(node.name);
  if (!binding) {
    return node;
  }

  if (binding.path.node.type === 'VariableDeclarator') {
    return resolveIdentifier(binding.path.node.init!, scope);
  }

  return node;
};

const isAppServicesContext = (node: Node, scope: Scope): boolean => {
  const resolvedNode = resolveIdentifier(node, scope);
  if (resolvedNode.type !== 'Identifier') {
    return false;
  }

  return resolvedNode.name === 'context';
};

const isAppServicesContextMember = (node: Node, scope: Scope, memberName: string): boolean => {
  const resolvedNode = resolveIdentifier(node, scope);
  if (resolvedNode.type !== 'MemberExpression') {
    return false;
  }

  if (resolvedNode.property.type !== 'Identifier') {
    return false;
  }

  if (resolvedNode.property.name !== memberName) {
    return false;
  }

  return isAppServicesContext(resolvedNode.object, scope);
};

const isAppServicesContextServices = (node: Node, scope: Scope): boolean => {
  return isAppServicesContextMember(node, scope, 'services');
};

const isAppServicesContextValues = (node: Node, scope: Scope): boolean => {
  return isAppServicesContextMember(node, scope, 'values');
};

interface MongoClientInstance {
  id: BabelCoreNamespace.types.Identifier;
  connString: string;
}

enum StateKey {
  MONGO_CLIENT_KEY_PREFIX = 'MONGO_CLIENT_',
  MONGO_CLIENT_INSTANCE_LIST = 'MONGO_CLIENT_INSTANCE_LIST',
  MONGO_CLIENT_LIST_VAR = 'MONGO_CLIENT_LIST_VAR',
  MONGO_CLIENT_CLEANUP_FINALLY_STATEMENT = 'MONGO_CLIENT_CLEANUP_FINALLY_STATEMENT'
}

export default function ({ types: t }: typeof BabelCoreNamespace): PluginObj {
  return {
    name: 'appservices-context-transformer',

    visitor: {
      Program: {
        // create list of mongo clients to track for cleanup
        enter(path, state) {
          state.set(StateKey.MONGO_CLIENT_INSTANCE_LIST, []);
          state.set(StateKey.MONGO_CLIENT_LIST_VAR, path.scope.generateUidIdentifier('mongoClients'));
        },

        // initialize required mongo clients, as well as cleanup list
        exit(path, state) {
          const mongoClientInstances = state.get(StateKey.MONGO_CLIENT_INSTANCE_LIST) as MongoClientInstance[];
          if (mongoClientInstances.length === 0) {
            // clear the cleanup statement if there are no clients
            const finallyStatement = state.get(StateKey.MONGO_CLIENT_CLEANUP_FINALLY_STATEMENT) as BlockStatement;
            if (finallyStatement) {
              finallyStatement.body = [];
            }

            return;
          }

          // add mongodb import
          const mongoClientType = addNamed(path, 'MongoClient', 'mongodb');

          // add list of clients to cleanup
          const mongoClientList = t.arrayExpression();
          const mongoClientListVar = state.get(StateKey.MONGO_CLIENT_LIST_VAR) as BabelCoreNamespace.types.Identifier;

          path.unshiftContainer('body', t.variableDeclaration('const', [
            t.variableDeclarator(
              mongoClientListVar,
              mongoClientList,
            )
          ]));

          mongoClientInstances.forEach(({ id, connString }) => {
            // declare in global scope
            path.unshiftContainer('body', t.variableDeclaration('const', [
              t.variableDeclarator(id, t.newExpression(mongoClientType, [t.stringLiteral(connString)],),
              )
            ]));

            // add to cleanup list
            mongoClientList.elements.push(id);
          });
        }
      },

      // exports = ... -> export default ...
      // wrap function body in try/finally to call cleanup
      ExpressionStatement(path, state) {
        if (!t.isProgram(path.parent)) {
          // not in outermost scope
          return;
        }

        if (!t.isAssignmentExpression(path.node.expression)) {
          return;
        }

        const lhs = path.node.expression.left;
        const rhs = path.node.expression.right;

        if (!t.isIdentifier(lhs)) {
          return;
        }

        if (lhs.name !== 'exports') {
          return;
        }

        if (!t.isFunctionExpression(rhs)) {
          return;
        }

        const mongoClientListVar = state.get(StateKey.MONGO_CLIENT_LIST_VAR) as BabelCoreNamespace.types.Identifier;
        const finallyStatement = t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(mongoClientListVar, t.identifier('forEach')), [
              t.arrowFunctionExpression(
                [t.identifier('mc')],
                t.callExpression(t.memberExpression(t.identifier('mc'), t.identifier('close')), []),
              )
            ]),
          )
        ]);
        state.set(StateKey.MONGO_CLIENT_CLEANUP_FINALLY_STATEMENT, finallyStatement);

        const wrappedFnBody = t.blockStatement([
          t.tryStatement(
            rhs.body,         // try
            null,             // catch
            finallyStatement, // finally
          )
        ]);

        path.replaceWith(t.exportDefaultDeclaration(t.functionExpression(
          rhs.id,
          rhs.params,
          wrappedFnBody,
          rhs.generator,
          rhs.async,
        )));
      },

      // context.<...> -> vanilla JS
      CallExpression(path, state) {
        const callee = path.node.callee;
        if (!t.isMemberExpression(callee)) {
          return;
        }

        if (!t.isIdentifier(callee.property)) {
          return;
        }

        if (callee.property.name !== 'get') {
          return;
        }

        if (isAppServicesContextServices(callee.object, path.scope)) {
          const dataSourceMappings = state.opts['datasources'];
          if (!dataSourceMappings) {
            throw path.buildCodeFrameError(`Found data source usage, but data source mappings were not provided`);
          }

          const args = path.node.arguments;
          if (args.length !== 1) {
            throw path.buildCodeFrameError(`Expected exactly one argument, but found ${args.length}`);
          }

          const resolvedArg = resolveIdentifier(args[0], path.scope);
          if (!t.isStringLiteral(resolvedArg)) {
            throw path.buildCodeFrameError(`Expected string argument, but found ${resolvedArg.type}`);
          }

          const connString = dataSourceMappings[resolvedArg.value];
          if (!connString) {
            throw path.buildCodeFrameError(`Could not find mapping for ${resolvedArg.value} data source`);
          }

          // generate a client for this data source if one wasn't already added
          const mongoClientKey = `${StateKey.MONGO_CLIENT_KEY_PREFIX}${connString}`;
          const id = state.get(mongoClientKey) ?? state.file.scope.generateUidIdentifier('mongoClient');

          state.set(mongoClientKey, id);
          state.set(StateKey.MONGO_CLIENT_INSTANCE_LIST, [
            ...state.get(StateKey.MONGO_CLIENT_INSTANCE_LIST),
            { id, connString },
          ]);

          path.replaceWith(id);

        } else if (isAppServicesContextValues(callee.object, path.scope)) {
          const valueMappings = state.opts['values'];
          if (!valueMappings) {
            throw path.buildCodeFrameError(`Found values usage, but value mappings were not provided`);
          }

          const args = path.node.arguments;
          if (args.length !== 1) {
            throw path.buildCodeFrameError(`Expected exactly one argument, but found ${args.length}`);
          }

          const resolvedArg = resolveIdentifier(args[0], path.scope);
          if (!t.isStringLiteral(resolvedArg)) {
            throw path.buildCodeFrameError(`Expected string argument, but found ${resolvedArg.type}`);
          }

          const val = valueMappings[resolvedArg.value];
          if (!val) {
            throw path.buildCodeFrameError(`Could not find mapping for ${resolvedArg.value} value`);
          }

          path.replaceWith(t.stringLiteral(val));
        }
      },
    },
  };
}
