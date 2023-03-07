import * as BabelCoreNamespace from '@babel/core';
import { Node, PluginObj } from '@babel/core';
import { addNamed } from "@babel/helper-module-imports";
import { Scope } from '@babel/traverse';

const resolveIdentifier = (node: Node, scope: Scope): Node => {
  if (node.type !== 'Identifier') {
    return node;
  }

  const binding = scope.bindings[node.name];
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

export default function ({ types: t }: typeof BabelCoreNamespace): PluginObj {
  return {
    name: 'appservices-context-transformer',
    visitor: {
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

          // generate an import if one wasn't already added
          const mongoClientType = state.get('mongoClientType') ?? addNamed(path, 'MongoClient', 'mongodb');
          state.set('mongoClientType', mongoClientType);

          path.replaceWith(
            t.expressionStatement(t.newExpression(
              mongoClientType,
              [t.stringLiteral(connString)],
            )),
          );

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
