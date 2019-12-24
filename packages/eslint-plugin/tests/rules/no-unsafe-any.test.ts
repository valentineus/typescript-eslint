import rule from '../../src/rules/no-unsafe-any';
import {
  RuleTester,
  batchedSingleLineTests,
  getFixturesRootDir,
} from '../RuleTester';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: getFixturesRootDir(),
  },
});

ruleTester.run('no-unsafe-any', rule, {
  valid: [
    'const a = null',
    'const a = undefined',
    'let b: string | null = null',
    'var b: number | null = null',
    {
      code: `
        const x: any = 1;
        const y: number = x;
      `,
      options: [{ allowVariableAnnotationFromAny: true }],
    },
    'const a = Array("str");',
    'const a = ["str"];',
    `
      declare const arg: string | number;
      const a = Array(arg); // typeof === (string | number)[];
    `,
    'for (const x of [1]) {}',
    'foo(1)',
    'x = 1',
    'function foo(arg: string) { return arg; }',
    'function foo() { return 1; }',
    '1++;',
    'if (1) {}',
    'while (1) {}',
    'do {} while (1)',
    '(1) ? 1 : 2;',
    'switch (1) { case 1: }',
    'switch (1) { default: }',
  ],
  invalid: [
    // typeReferenceResolvesToAny
    {
      code: `
type T = any;

let x: T = 1;
let y: string | T = 1;
const z = new Map<T, T>();
function foo(): T {}
      `,
      errors: [
        {
          messageId: 'typeReferenceResolvesToAny',
          line: 4,
        },
        {
          messageId: 'typeReferenceResolvesToAny',
          line: 5,
        },
        {
          messageId: 'typeReferenceResolvesToAny',
          line: 6,
        },
        {
          messageId: 'typeReferenceResolvesToAny',
          line: 6,
        },
        {
          messageId: 'typeReferenceResolvesToAny',
          line: 7,
        },
      ],
    },

    // letVariableWithNoInitialAndNoAnnotation
    ...batchedSingleLineTests({
      code: `
let x;
var x;
let x, y;
var x, y;
let x, y = 1;
      `,
      errors: [
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 2,
        },
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 3,
        },
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 4,
        },
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 4,
        },
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 5,
        },
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 5,
        },
        {
          messageId: 'letVariableWithNoInitialAndNoAnnotation',
          line: 6,
        },
      ],
    }),

    // letVariableInitialisedToNullishAndNoAnnotation
    ...batchedSingleLineTests({
      code: `
let a = null;
let a = undefined;
var a = undefined, b = null;
let a: string | null = null, b = null;
      `,
      errors: [
        {
          messageId: 'letVariableInitialisedToNullishAndNoAnnotation',
          line: 2,
          data: {
            kind: 'let',
          },
        },
        {
          messageId: 'letVariableInitialisedToNullishAndNoAnnotation',
          line: 3,
          data: {
            kind: 'let',
          },
        },
        {
          messageId: 'letVariableInitialisedToNullishAndNoAnnotation',
          line: 4,
          data: {
            kind: 'var',
          },
        },
        {
          messageId: 'letVariableInitialisedToNullishAndNoAnnotation',
          line: 4,
          data: {
            kind: 'var',
          },
        },
        {
          messageId: 'letVariableInitialisedToNullishAndNoAnnotation',
          line: 5,
          data: {
            kind: 'let',
          },
        },
      ],
    }),

    // variableDeclarationInitialisedToAnyWithoutAnnotation
    ...batchedSingleLineTests({
      code: `
const b = (1 as any);
const c = (1 as any) + 1;
const { baz } = (1 as any);

const a = [];
const b = Array();
const c = new Array();
const d = Array(1);
const e = new Array(1);
      `,
      errors: [
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 2,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 3,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 4,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 6,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 7,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 8,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 9,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 10,
        },
      ],
    }),
    {
      code: `
        const a = 1;
        const b = new Array(a);
      `,
      errors: [
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 3,
        },
      ],
    },

    // variableDeclarationInitialisedToAnyWithAnnotation
    ...batchedSingleLineTests({
      code: `
const bbbb: number = (1 as any);
const c: number = (1 as any) + 1;
      `,
      options: [{ allowVariableAnnotationFromAny: false }],
      errors: [
        {
          messageId: 'variableDeclarationInitialisedToAnyWithAnnotation',
          line: 2,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithAnnotation',
          line: 3,
        },
      ],
    }),

    // patternVariableDeclarationInitialisedToAny
    ...batchedSingleLineTests({
      code: `
const { x, y } = { x: 1 as any, y: 1 as any };
const { x, y } = { x: 1 } as { x: number, y: any };
const { x: { y } } = { x: { y: 1 as any } };
const { x: { y: [a, b] } } = { x: { y: [1] } } as { x: { y: any[] } };
const [a,b] = [1 as any, 2 as any];
const [{ a }] = [1 as any];
      `,
      errors: [
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 2,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 2,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 3,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 4,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 5,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 5,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 6,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 6,
        },
        {
          messageId: 'patternVariableDeclarationInitialisedToAny',
          line: 7,
        },
      ],
    }),

    // loopVariableInitialisedToAny
    ...batchedSingleLineTests({
      code: `
for (const x of ([] as any)) {}
for (const x of ([] as any[])) {}
      `,
      errors: [
        {
          messageId: 'loopVariableInitialisedToAny',
          line: 2,
        },
        {
          messageId: 'loopVariableInitialisedToAny',
          line: 3,
        },
      ],
    }),

    // returnAny
    ...batchedSingleLineTests({
      code: `
function foo(arg: any) { return arg; }
function foo(arg: any[]) { return arg; }
function foo() { return (1 as any); }
const foo = () => (1 as any);
const foo = (arg: any[]) => arg;
      `,
      errors: [
        {
          messageId: 'returnAny',
          line: 2,
        },
        {
          messageId: 'returnAny',
          line: 3,
        },
        {
          messageId: 'returnAny',
          line: 4,
        },
        {
          messageId: 'returnAny',
          line: 5,
        },
        {
          messageId: 'returnAny',
          line: 6,
        },
      ],
    }),

    // passedArgumentIsAny
    ...batchedSingleLineTests({
      code: `
foo((1 as any));
foo((1 as any[]));
foo((1 as any[]), (1 as any));
foo(1, (1 as any));
      `,
      errors: [
        {
          messageId: 'passedArgumentIsAny',
          line: 2,
        },
        {
          messageId: 'passedArgumentIsAny',
          line: 3,
        },
        {
          messageId: 'passedArgumentIsAny',
          line: 4,
        },
        {
          messageId: 'passedArgumentIsAny',
          line: 4,
        },
        {
          messageId: 'passedArgumentIsAny',
          line: 5,
        },
      ],
    }),

    // assignmentValueIsAny
    ...batchedSingleLineTests({
      code: `
x = (1 as any);
x = (1 as any[]);
x += (1 as any);
x -= (1 as any);
x |= (1 as any);
x.y = (1 as any);
      `,
      errors: [
        {
          messageId: 'assignmentValueIsAny',
          line: 2,
        },
        {
          messageId: 'assignmentValueIsAny',
          line: 3,
        },
        {
          messageId: 'assignmentValueIsAny',
          line: 4,
        },
        {
          messageId: 'assignmentValueIsAny',
          line: 5,
        },
        {
          messageId: 'assignmentValueIsAny',
          line: 6,
        },
        {
          messageId: 'assignmentValueIsAny',
          line: 7,
        },
      ],
    }),

    // updateExpressionIsAny
    ...batchedSingleLineTests({
      code: `
(1 as any)++;
(1 as any)--;
++(1 as any);
--(1 as any);
      `,
      errors: [
        {
          messageId: 'updateExpressionIsAny',
          line: 2,
        },
        {
          messageId: 'updateExpressionIsAny',
          line: 3,
        },
        {
          messageId: 'updateExpressionIsAny',
          line: 4,
        },
        {
          messageId: 'updateExpressionIsAny',
          line: 5,
        },
      ],
    }),

    // booleanTestIsAny
    ...batchedSingleLineTests({
      code: `
if (1 as any) {}
while (1 as any) {}
do {} while (1 as any)
;(1 as any) ? 1 : 2;
      `,
      errors: [
        {
          messageId: 'booleanTestIsAny',
          line: 2,
        },
        {
          messageId: 'booleanTestIsAny',
          line: 3,
        },
        {
          messageId: 'booleanTestIsAny',
          line: 4,
        },
        {
          messageId: 'booleanTestIsAny',
          line: 5,
        },
      ],
    }),

    // switchDiscriminantIsAny
    ...batchedSingleLineTests({
      code: `
switch (1 as any) {}
switch (1 as any[]) {}
      `,
      errors: [
        {
          messageId: 'switchDiscriminantIsAny',
          line: 2,
        },
        {
          messageId: 'switchDiscriminantIsAny',
          line: 3,
        },
      ],
    }),

    // switchCaseTestIsAny
    ...batchedSingleLineTests({
      code: `
switch (1) { case (1 as any): }
switch (1) { case (1 as any[]): }
      `,
      errors: [
        {
          messageId: 'switchCaseTestIsAny',
          line: 2,
        },
        {
          messageId: 'switchCaseTestIsAny',
          line: 3,
        },
      ],
    }),
  ],
});
