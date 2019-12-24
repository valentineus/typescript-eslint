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
      options: [{ allowAnnotationFromAny: true }],
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
    {
      code: `
const a: any = 1;

const b = a;
const c = a + 1;
      `,
      options: [{ allowAnnotationFromAny: false }],
      errors: [
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 4,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithoutAnnotation',
          line: 5,
        },
      ],
    },

    // variableDeclarationInitialisedToAnyWithAnnotation
    {
      code: `
const a: any = 1;

const b: number = a;
const c: number = a + 1;
      `,
      options: [{ allowAnnotationFromAny: false }],
      errors: [
        {
          messageId: 'variableDeclarationInitialisedToAnyWithAnnotation',
          line: 4,
        },
        {
          messageId: 'variableDeclarationInitialisedToAnyWithAnnotation',
          line: 5,
        },
      ],
    },

    // variableDeclarationInitialisedToAnyArrayWithoutAnnotation
    ...batchedSingleLineTests({
      code: `
const a = [];
const b = Array();
const c = new Array();
const d = Array(1);
const e = new Array(1);
      `,
      errors: [
        {
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
          line: 2,
        },
        {
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
          line: 3,
        },
        {
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
          line: 4,
        },
        {
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
          line: 5,
        },
        {
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
          line: 6,
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
          messageId:
            'variableDeclarationInitialisedToAnyArrayWithoutAnnotation',
          line: 3,
        },
      ],
    },

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
  ],
});
