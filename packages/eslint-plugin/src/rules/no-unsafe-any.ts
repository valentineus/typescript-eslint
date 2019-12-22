import { TSESTree } from '@typescript-eslint/experimental-utils';
import * as util from '../util';

type Options = [
  {
    allowAnnotationFromAny?: boolean;
  },
];
type MessageIds =
  | 'typeReferenceResolvesToAny'
  | 'variableDeclarationInitToAnyWithoutAnnotation'
  | 'variableDeclarationInitToAnyWithAnnotation'
  | 'variableLetInitialisedToNullishAndNoAnnotation'
  | 'variableLetWithNoInitialAndNoAnnotation';

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
      variableDeclarationInitToAnyWithAnnotation:
        'Variable declaration is initialised to `any` with an explicit type annotation, which is unsafe. Prefer explicit type narrowing via type guards.',
      variableDeclarationInitToAnyWithoutAnnotation:
        'Variable declaration is initialised to `any` without an assertion or a type annotation.',
      variableLetInitialisedToNullishAndNoAnnotation:
        'Variable declared with {{kind}} and initialised to `null` or `undefined` is implicitly typed as `any`. Add an explicit type annotation.',
      variableLetWithNoInitialAndNoAnnotation:
        'Variable declared with {{kind}} with no initial value is implicitly typed as `any`.',
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

    function typeReferenceResolvesToAny(node: TSESTree.TypeNode): boolean {
      const tsNode = esTreeNodeToTSNodeMap.get(node);
      const type = checker.getTypeAtLocation(tsNode);
      if (util.isAnyType(type)) {
        return true;
      }

      return false;
    }

    return {
      // typeReferenceResolvesToAny
      TSTypeReference(node): void {
        if (!typeReferenceResolvesToAny(node)) {
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
      // Handled by the no-explicit-any rule (with a fixer)
      //TSAnyKeyword(node): void {},

      // variableLetWithNoInitialAndNoAnnotation
      'VariableDeclaration:matches([kind = "let"], [kind = "var"]) > VariableDeclarator:not([init])'(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (node.id.typeAnnotation) {
          return;
        }

        const parent = node.parent as TSESTree.VariableDeclaration;
        context.report({
          node,
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          data: {
            kind: parent.kind,
          },
        });
      },

      // variableLetInitialisedToNullishAndNoAnnotation
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
            messageId: 'variableLetInitialisedToNullishAndNoAnnotation',
            data: {
              kind: parent.kind,
            },
          });
        }
      },

      // variableDeclarationInitToAnyWithAnnotation
      // variableDeclarationInitToAnyWithoutAnnotation
      'VariableDeclaration > VariableDeclarator[init]'(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (!node.init || util.isTypeAssertion(node.init)) {
          // type assertions are handled via their own selector
          return;
        }

        const tsNode = esTreeNodeToTSNodeMap.get(node.init);
        const type = checker.getTypeAtLocation(tsNode);

        if (!util.isAnyType(type)) {
          return;
        }

        // the variable is initialised to any...

        if (!node.id.typeAnnotation) {
          return context.report({
            node,
            messageId: 'variableDeclarationInitToAnyWithoutAnnotation',
          });
        }

        // there is a type annotation

        if (allowAnnotationFromAny) {
          // there is an annotation on the type, and the user indicated they are okay with the "unsafe" conversion
          return;
        }

        return context.report({
          node,
          messageId: 'variableDeclarationInitToAnyWithAnnotation',
        });
      },
    };
  },
});
