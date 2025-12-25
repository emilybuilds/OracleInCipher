import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'OracleInCipher',
  projectId: '5e2c46c0e1274f5ca0e5bd08b6761234',
  chains: [sepolia],
  ssr: false,
});
