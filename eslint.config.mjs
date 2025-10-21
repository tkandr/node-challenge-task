import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import * as drizzlePlugin from 'eslint-plugin-drizzle';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      drizzle: drizzlePlugin,
      'simple-import-sort': simpleImportSort,
    },
  },
  // Load drizzle recommended config
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      ...drizzlePlugin.configs.recommended.rules,
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Disable unbound-method rule in test files
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts', 'test/**/*.js'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Simple import sort rules
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            ['^\\u0000'],
            ['^@?\\w', '^@nestjs(/.*|$)'],
            ['^@debridge(/.*|$)'],
            ['^~/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'warn',

      // Drizzle rules
      'drizzle/enforce-delete-with-where': 'error',

      // Member ordering rules
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: [
            // Index signature
            'signature',
            'call-signature',

            // Fields
            'public-static-field',
            'protected-static-field',
            'private-static-field',

            // Static methods
            'public-static-method',
            'protected-static-method',
            'private-static-method',

            'public-decorated-field',
            'protected-decorated-field',
            'private-decorated-field',

            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',

            'public-abstract-field',
            'protected-abstract-field',

            'public-field',
            'protected-field',
            'private-field',

            'static-field',
            'instance-field',
            'abstract-field',

            'decorated-field',

            'field',

            // Constructors
            'public-constructor',
            'protected-constructor',
            'private-constructor',

            'constructor',

            // Getters and Setters
            ['public-static-get', 'public-static-set'],
            ['protected-static-get', 'protected-static-set'],
            ['private-static-get', 'private-static-set'],

            ['public-decorated-get', 'public-decorated-set'],
            ['protected-decorated-get', 'protected-decorated-set'],
            ['private-decorated-get', 'private-decorated-set'],

            ['public-instance-get', 'public-instance-set'],
            ['protected-instance-get', 'protected-instance-set'],
            ['private-instance-get', 'private-instance-set'],

            ['public-abstract-get', 'public-abstract-set'],
            ['protected-abstract-get', 'protected-abstract-set'],

            ['public-get', 'public-set'],
            ['protected-get', 'protected-set'],
            ['private-get', 'private-set'],

            ['static-get', 'static-set'],
            ['instance-get', 'instance-set'],
            ['abstract-get', 'abstract-set'],

            ['decorated-get', 'decorated-set'],

            ['get', 'set'],

            // Methods
            'public-decorated-method',
            'protected-decorated-method',
            'private-decorated-method',

            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',

            'public-abstract-method',
            'protected-abstract-method',

            'public-method',
            'protected-method',
            'private-method',

            'static-method',
            'instance-method',
            'abstract-method',

            'decorated-method',

            'method',
          ],
        },
      ],
    },
  },
];
