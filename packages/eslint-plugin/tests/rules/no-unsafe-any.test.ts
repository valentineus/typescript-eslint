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

    // variableLetWithNoInitialAndNoAnnotation
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
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 2,
        },
        {
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 3,
        },
        {
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 4,
        },
        {
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 4,
        },
        {
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 5,
        },
        {
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 5,
        },
        {
          messageId: 'variableLetWithNoInitialAndNoAnnotation',
          line: 6,
        },
      ],
    }),

    // variableLetInitialisedToNullishAndNoAnnotation
    ...batchedSingleLineTests({
      code: `
let a = null;
let a = undefined;
var a = undefined, b = null;
let a: string | null = null, b = null;
      `,
      errors: [
        {
          messageId: 'variableLetInitialisedToNullishAndNoAnnotation',
          line: 2,
          data: {
            kind: 'let',
          },
        },
        {
          messageId: 'variableLetInitialisedToNullishAndNoAnnotation',
          line: 3,
          data: {
            kind: 'let',
          },
        },
        {
          messageId: 'variableLetInitialisedToNullishAndNoAnnotation',
          line: 4,
          data: {
            kind: 'var',
          },
        },
        {
          messageId: 'variableLetInitialisedToNullishAndNoAnnotation',
          line: 4,
          data: {
            kind: 'var',
          },
        },
        {
          messageId: 'variableLetInitialisedToNullishAndNoAnnotation',
          line: 5,
          data: {
            kind: 'let',
          },
        },
      ],
    }),

    // variableDeclarationInitToAnyWithAnnotation
    {
      code: `
const x: any = 1;
const y: number = x;
const z: number = x + 1;
      `,
      options: [{ allowAnnotationFromAny: false }],
      errors: [
        {
          messageId: 'variableDeclarationInitToAnyWithAnnotation',
          line: 3,
        },
        {
          messageId: 'variableDeclarationInitToAnyWithAnnotation',
          line: 4,
        },
      ],
    },

    // variableDeclarationInitToAnyWithoutAnnotation
    {
      code: `
const x: any = 1;
const y = x;
const z = x + 1;
      `,
      options: [{ allowAnnotationFromAny: false }],
      errors: [
        {
          messageId: 'variableDeclarationInitToAnyWithoutAnnotation',
          line: 3,
        },
        {
          messageId: 'variableDeclarationInitToAnyWithoutAnnotation',
          line: 4,
        },
      ],
    },
  ],
});
