import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="hero">
      <div className="hero__text">
        <p className="eyebrow">Encrypted oracle</p>
        <h1>
          Predict tomorrow&apos;s <span className="accent">ETH/BTC</span> close without revealing your targets.
        </h1>
        <p className="lede">
          Prices, directions, and rewards are encrypted end-to-end using Zama FHE. Stake ETH, keep your strategy
          private, and settle as soon as the oracle posts the next update.
        </p>
        <div className="badge-row">
          <span className="badge">Daily UTC0 settlements</span>
          <span className="badge badge--ghost">Relayer SDK ready</span>
        </div>
      </div>
      <div className="hero__actions">
        <ConnectButton showBalance={false} />
      </div>
    </header>
  );
}
