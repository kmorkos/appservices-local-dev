import * as BabelCoreNamespace from '@babel/core';
import { Node, PluginObj, PluginPass } from '@babel/core';

const isAppServicesContext = (node: Node, state: PluginPass): boolean => {
  if (node.type !== 'Identifier') {
    return false;
  }

  const binding = state.file.scope.bindings[node.name];
  if (!binding) {
    return node.name === 'context';
  }

  // check if this is pointing to variable declared elsewhere
  if (binding.path.node.type !== 'VariableDeclarator') {
    return false;
  }

  if (!binding.path.node.init) {
    return false;
  }

  return isAppServicesContext(binding.path.node.init, state);
};

const isAppServicesContextMember = (node: Node, state: PluginPass, memberName: string): boolean => {
  // it can be accessed on an app services context in this path
  if (node.type === 'MemberExpression') {
    if (node.property.type !== 'Identifier') {
      return false;
    }

    if (node.property.name !== memberName) {
      return false;
    }

    return isAppServicesContext(node.object, state);
  }

  // or it can be a stored variable
  if (node.type !== 'Identifier') {
    return false;
  }

  const binding = state.file.scope.bindings[node.name];
  if (!binding) {
    return false;
  }

  if (binding.path.node.type !== 'VariableDeclarator') {
    return false;
  }

  if (!binding.path.node.init) {
    return false;
  }

  return isAppServicesContextMember(binding.path.node.init, state, memberName);
};

const isAppServicesContextServices = (node: Node, state: PluginPass): boolean => {
  return isAppServicesContextMember(node, state, 'services');
};

export default function ({ types: t }: typeof BabelCoreNamespace): PluginObj {
  return {
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

        if (isAppServicesContextServices(callee.object, state)) {
          const args = path.node.arguments;
          if (args.length !== 1) {
            throw path.buildCodeFrameError(`Expected exactly one argument, but found ${args.length}`);
          }

          if (!t.isStringLiteral(args[0])) {
            throw path.buildCodeFrameError(`Expected StringLiteral argument, but found ${args[0].type}`);
          }

          const serviceName = args[0].value;

          const dataSourceMappings = state.opts['datasources'];
          const connString = dataSourceMappings ? dataSourceMappings[serviceName] : '';

          if (!connString) {
            throw path.buildCodeFrameError(`Could not find mapping for ${serviceName} data source`);
          }

          path.replaceWith(
            t.expressionStatement(t.newExpression(
              t.identifier('MongoClient'),
              [t.stringLiteral(connString)],
            )),
          );
        }
      },
    },
  };
}
