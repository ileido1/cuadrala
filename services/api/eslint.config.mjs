import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/** Wave 0 cerrado en error; excepciones documentadas → Wave 1–2. */
const LAYER_BOUNDARY_SEVERITY = 'error';

const LAYER_BOUNDARY_PATTERNS = {
  infrastructure: {
    group: ['**/infrastructure/**'],
    message:
      'Clean Architecture: no importar infrastructure fuera de presentation/composition. Usa ports en domain y adapters vía DI.',
  },
  prismaGenerated: {
    group: ['**/generated/prisma', '**/generated/prisma/**'],
    message:
      'Clean Architecture: no importar Prisma generado fuera de infrastructure/composition.',
  },
  presentation: {
    group: ['**/presentation/**'],
    message:
      'Clean Architecture: application/domain no deben importar presentation.',
  },
  application: {
    group: ['**/application/**'],
    message: 'Clean Architecture: domain no debe importar application.',
  },
  godServices: {
    group: ['**/application/**/*.service', '**/application/**/*.service.js'],
    message:
      'Clean Architecture: routes no deben importar application/*.service — usar use_cases vía composition.',
  },
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'prisma/generated/**',
      'generated/**',
      'src/generated/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        LAYER_BOUNDARY_SEVERITY,
        {
          patterns: [
            LAYER_BOUNDARY_PATTERNS.infrastructure,
            LAYER_BOUNDARY_PATTERNS.prismaGenerated,
            LAYER_BOUNDARY_PATTERNS.presentation,
            LAYER_BOUNDARY_PATTERNS.application,
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        LAYER_BOUNDARY_SEVERITY,
        {
          patterns: [
            LAYER_BOUNDARY_PATTERNS.infrastructure,
            LAYER_BOUNDARY_PATTERNS.prismaGenerated,
            LAYER_BOUNDARY_PATTERNS.presentation,
          ],
        },
      ],
      'no-restricted-syntax': [
        LAYER_BOUNDARY_SEVERITY,
        {
          selector:
            'ImportDeclaration[source.value=/\\/application\\/[a-z0-9_]+\\.service\\.js$/]',
          message:
            'Prohibido importar application/*.service.ts en raíz — usar use_cases + composition.',
        },
      ],
    },
  },
  {
    files: ['src/presentation/controllers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        LAYER_BOUNDARY_SEVERITY,
        {
          patterns: [
            LAYER_BOUNDARY_PATTERNS.infrastructure,
            LAYER_BOUNDARY_PATTERNS.prismaGenerated,
          ],
        },
      ],
    },
  },
  {
    files: ['src/presentation/routes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        LAYER_BOUNDARY_SEVERITY,
        {
          patterns: [
            LAYER_BOUNDARY_PATTERNS.infrastructure,
            LAYER_BOUNDARY_PATTERNS.godServices,
          ],
        },
      ],
    },
  },
  prettier,
];
