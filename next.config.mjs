import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

export default function config(phase) {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    devIndicators: false,
    // Permite probar el servidor de desarrollo desde celulares en la red local.
    allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  };
}
