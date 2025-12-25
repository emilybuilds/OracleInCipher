# OracleInCipher Frontend

Single-page React + Vite app for the OraclePrediction smart contract. Users can:

- Submit encrypted ETH/BTC price predictions for the next day (price + direction).
- Stake ETH and later claim encrypted points equal to the stake when correct.
- View and decrypt daily recorded prices, personal predictions, and points via the Zama relayer SDK.

## Quick start

1. Install dependencies
   ```bash
   npm install
   ```
2. Update `src/config/contracts.ts` with the Sepolia contract address once deployed.
3. Run the dev server
   ```bash
   npm run dev
   ```

## Usage notes
- Reads rely on the `sepolia` chain from Wagmi/RainbowKit (no environment variables are used).
- Prices are handled in USD with 2 decimal places (e.g., enter `2625.32` to encrypt `262532` cents).
- Connect a wallet, enter the contract address, and ensure the Zama SDK finishes loading before decrypting.
