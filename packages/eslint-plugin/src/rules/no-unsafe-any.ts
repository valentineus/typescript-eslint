import { TSESTree } from '@typescript-eslint/experimental-utils';
import { isTypeReference } from 'tsutils';
import * as ts from 'typescript';
import * as util from '../util';

type Options = [
  {
    allowAnnotationFromAny?: boolean;
  },
];
type MessageIds =
  | 'typeReferenceResolvesToAny'
  | 'variableDeclarationInitialisedToAnyWithoutAnnotation'
  | 'variableDeclarationInitialisedToAnyWithAnnotation'
  | 'letVariableInitialisedToNullishAndNoAnnotation'
  | 'letVariableWithNoInitialAndNoAnnotation'
  | 'variableDeclarationInitialisedToAnyArrayWithoutAnnotation'
  | 'loopVariableInitialisedToAny'
  | 'returnAny'
  | 'passedArgumentIsAny'
  | 'assignmentValueIsAny';

export default util.createRule<Options, MessageIds>({
  name: 'no-unsafe-any',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects usages of any which can cause type safety holes within your codebase',
      category: 'Possible Errors',
      recommended: false,
    },
    messages: {
      typeReferenceResolvesToAny:
        'Referenced type {{typeName}} resolves to `any`.',
      variableDeclarationInitialisedToAnyWithAnnotation:
        'Variable declaration is initialised to `any` with an explicit type annotation, which is potentially unsafe. Prefer explicit type narrowing via type guards.',
      variableDeclarationInitialisedToAnyWithoutAnnotation:
        'Variable declaration is initialised to `any` without an assertion or a type annotation.',
      letVariableInitialisedToNullishAndNoAnnotation:
        'Variable declared with {{kind}} and initialised to `null` or `undefined` is implicitly typed as `any`. Add an explicit type annotation.',
      letVariableWithNoInitialAndNoAnnotation:
        'Variable declared with {{kind}} with no initial value is implicitly typed as `any`.',
      variableDeclarationInitialisedToAnyArrayWithoutAnnotation:
        'Variable declaration is initialised to `any[]` without an assertion or a type annotation.',
      loopVariableInitialisedToAny: 'Loop variable is typed as `any`.',
      returnAny: 'The type of the return is `any`.',
      passedArgumentIsAny: 'The passed argument is `any`.',
      assignmentValueIsAny: 'The value being assigned is `any`.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowAnnotationFromAny: {
            type: 'boolean',
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      allowAnnotationFromAny: false,
    },
  ],
  create(context, [{ allowAnnotationFromAny }]) {
    const { program, esTreeNodeToTSNodeMap } = util.getParserServices(context);
    const checker = program.getTypeChecker();
    const sourceCode = context.getSourceCode();

    /**
     * @returns true if the type is `any`
     */
    function isAnyType(node: ts.Node): boolean {
      const type = checker.getTypeAtLocation(node);
      return util.isTypeFlagSet(type, ts.TypeFlags.Any);
    }
    /**
     * @returns true if the type is `any[]` or `readonly any[]`
     */
    function isAnyArrayType(node: ts.Node): boolean {
      const type = checker.getTypeAtLocation(node);
      return (
        checker.isArrayType(type) &&
        isTypeReference(type) &&
        util.isTypeFlagSet(checker.getTypeArguments(type)[0], ts.TypeFlags.Any)
      );
    }

    return {
      // Handled by the no-explicit-any rule (with a fixer)
      //TSAnyKeyword(node): void {},

      // typeReferenceResolvesToAny
      TSTypeReference(node): void {
        const tsNode = esTreeNodeToTSNodeMap.get(node);
        if (!isAnyType(tsNode)) {
          return;
        }

        const typeName = sourceCode.getText(node);
        context.report({
          node,
          messageId: 'typeReferenceResolvesToAny',
          data: {
            typeName,
          },
        });
      },

      // letVariableWithNoInitialAndNoAnnotation
      'VariableDeclaration:matches([kind = "let"], [kind = "var"]) > VariableDeclarator:not([init])'(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (node.id.typeAnnotation) {
          return;
        }

        const parent = node.parent as TSESTree.VariableDeclaration;
        context.report({
          node,
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          data: {
            kind: parent.kind,
          },
        });
      },

      // letVariableInitialisedToNullishAndNoAnnotation
      'VariableDeclaration:matches([kind = "let"], [kind = "var"]) > VariableDeclarator[init]'(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (node.id.typeAnnotation) {
          return;
        }

        const parent = node.parent as TSESTree.VariableDeclaration;
        if (
          util.isNullLiteral(node.init) ||
          util.isUndefinedIdentifier(node.init)
        ) {
          context.report({
            node,
            messageId: 'letVariableInitialisedToNullishAndNoAnnotation',
            data: {
              kind: parent.kind,
            },
          });
        }
      },

      // variableDeclarationInitialisedToAnyWithAnnotation
      // variableDeclarationInitialisedToAnyWithoutAnnotation
      'VariableDeclaration > VariableDeclarator[init]'(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (!node.init || util.isTypeAssertion(node.init)) {
          // type assertions are handled via their own selector
          return;
        }

        const tsNode = esTreeNodeToTSNodeMap.get(node.init);
        if (!isAnyType(tsNode)) {
          return;
        }

        // the variable is initialised to any...

        if (!node.id.typeAnnotation) {
          return context.report({
            node,
            messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          });
        }

        // there is a type annotation

        if (allowAnnotationFromAny) {
          // there is an annotation on the type, and the user indicated they are okay with the "unsafe" conversion
          return;
        }

        return context.report({
          node,
          messageId: 'variableDeclarationInitialisedToAnyWithAnnotation',
        });
      },

      // #region variableDeclarationInitialisedToAnyArrayWithoutAnnotation

      // const x = []
      'VariableDeclaration > VariableDeclarator > ArrayExpression[elements.length = 0].init'(
        node: TSESTree.ArrayExpression,
      ): void {
        const parent = node.parent as TSESTree.VariableDeclarator;
        if (parent.id.typeAnnotation) {
          return;
        }

        context.report({
          node: parent,
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
        });
      },
      [[
        // const x = Array(...)
        'VariableDeclaration > VariableDeclarator > CallExpression[callee.name = "Array"].init',
        // const x = new Array(...)
        'VariableDeclaration > VariableDeclarator > NewExpression[callee.name = "Array"].init',
      ].join(', ')](
        node: TSESTree.CallExpression | TSESTree.NewExpression,
      ): void {
        const parent = node.parent as TSESTree.VariableDeclarator;
        if (parent.id.typeAnnotation) {
          return;
        }

        if (node.arguments.length > 1) {
          // Array(1, 2) === [1, 2]
          return;
        }

        if (node.arguments.length === 1) {
          // check if the 1 argument is a number, as Array(1) === [empty] === any[]
          const tsNode = esTreeNodeToTSNodeMap.get(node.arguments[0]);
          const type = checker.getTypeAtLocation(tsNode);
          if (!util.isTypeFlagSetNonUnion(type, ts.TypeFlags.NumberLike)) {
            return;
          }
        }

        context.report({
          node: parent,
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
        });
      },

      // #endregion variableDeclarationInitialisedToAnyArrayWithoutAnnotation

      // loopVariableInitialisedToAny
      'ForOfStatement > VariableDeclaration.left > VariableDeclarator'(
        node: TSESTree.VariableDeclarator,
      ): void {
        const tsNode = esTreeNodeToTSNodeMap.get(node);
        if (isAnyType(tsNode) || isAnyArrayType(tsNode)) {
          return context.report({
            node,
            messageId: 'loopVariableInitialisedToAny',
          });
        }
      },

      // returnAny
      'ReturnStatement[argument]'(node: TSESTree.ReturnStatement): void {
        const argument = util.nullThrows(
          node.argument,
          util.NullThrowsReasons.MissingToken('argument', 'ReturnStatement'),
        );
        const tsNode = esTreeNodeToTSNodeMap.get(argument);

        if (isAnyType(tsNode) || isAnyArrayType(tsNode)) {
          context.report({
            node,
            messageId: 'returnAny',
          });
        }
      },

      // passedArgumentIsAny
      'CallExpression[arguments.length > 0]'(
        node: TSESTree.CallExpression,
      ): void {
        for (const argument of node.arguments) {
          const tsNode = esTreeNodeToTSNodeMap.get(argument);

          if (isAnyType(tsNode) || isAnyArrayType(tsNode)) {
            context.report({
              node,
              messageId: 'passedArgumentIsAny',
            });
          }
        }
      },

      // assignmentValueIsAny
      AssignmentExpression(node): void {
        const tsNode = esTreeNodeToTSNodeMap.get(node.right);

        if (isAnyType(tsNode) || isAnyArrayType(tsNode)) {
          context.report({
            node,
            messageId: 'assignmentValueIsAny',
          });
        }
      },
    };
  },
});
