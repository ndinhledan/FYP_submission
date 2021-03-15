module.exports = {
  env: {
    browser: true,
    es6: true,
    jest: true,
  },
  extends: ['plugin:react/recommended', 'standard', 'react-app'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['react'],
  rules: {
    'no-warning-comments': [1, { terms: ['todo', 'fixme'], location: 'start' }],
    quotes: [2, 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
    // indent: ['error', 2],
    'no-trailing-spaces': [2, { skipBlankLines: true }],
    semi: [2, 'never'],
  },
}
