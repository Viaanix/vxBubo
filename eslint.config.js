import js from '@eslint/js'
import standard from './standard-eslint-config.mjs'

export default [
  standard,
  js.configs.recommended,
  {
    files: ['index.mjs', 'standard-eslint-config.mjs', 'src/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        browser: true,
        es2021: true,
        es6: true,
        jquery: true
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      semi: [2, 'always']
    }
  },
  {
    ignores: ['.bubo/**/*', 'dashboards/**/*', 'widgets/**/*', 'vscode-extension/**/*']
  }
]
