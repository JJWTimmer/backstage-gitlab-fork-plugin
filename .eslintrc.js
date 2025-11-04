module.exports = {
  extends: ['@backstage/eslint-plugin'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Custom rules can be added here
  },
};
