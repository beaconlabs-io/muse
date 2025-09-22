/** @type {import('prettier').Config} */
const config = {
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',

  plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
