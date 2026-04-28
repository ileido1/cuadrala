import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

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
        'error',
        {
          patterns: [
            {
              group: ['../**', '../../**'],
              message:
                'Clean Architecture: domain no debe importar otras capas ni generated. Define puertos/VOs propios y mapea en infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/use_cases/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../infrastructure/**', '../../infrastructure/**'],
              message:
                'Clean Architecture: application/use_cases no debe importar infrastructure. Usa puertos (interfaces) e inyección de dependencias.',
            },
            {
              group: ['../presentation/**', '../../presentation/**'],
              message:
                'Clean Architecture: application/use_cases no debe importar presentation. Mantén Express/Zod fuera de use cases.',
            },
            {
              group: ['../generated/**', '../../generated/**'],
              message:
                'Clean Architecture: application/use_cases no debe depender de Prisma generado. Mapea en infrastructure y usa entidades/DTOs propios.',
            },
          ],
        },
      ],
    },
  },
  prettier,
];
