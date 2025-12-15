// Flat config shim to reuse existing .eslintrc.js with ESLint v9
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  {
    ignores: ['node_modules', 'dist', 'build', '.expo', 'proxy-aws/node_modules'],
  },
  ...compat.config({ extends: [path.join(__dirname, '.eslintrc.js')] }),
];
