import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // Deuda del prototipo local; la regla sigue siendo error en código nuevo.
    files: ['src/app/page.tsx', 'src/components/booking-flow.tsx', 'src/components/owner-panel.tsx'],
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  globalIgnores([
    '.next/**', '.next-dev/**', 'next-env.d.ts',
    '.impeccable/**', '.opencode/**', 'frontend/**',
    'coverage/**', 'test-results/**', 'playwright-report/**',
  ]),
]);
