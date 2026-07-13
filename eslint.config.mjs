import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      'react-hooks/error-boundaries': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    'out/**',
    'scratch/**',
  ]),
]);
