# OracleInCipher

OracleInCipher is a privacy preserving daily price prediction market for ETH and BTC on Zama FHEVM.
Users submit encrypted target prices and encrypted directions (true for higher, false for lower), stake ETH, and later claim encrypted points when their prediction is correct after the daily UTC 00:00 oracle update.

## Overview
This project combines Fully Homomorphic Encryption (FHE) with on-chain settlement so predictions can be evaluated without revealing user inputs or the recorded daily price.
It is designed for a minimal, auditable flow: one update per day, one claim per user, and all sensitive values remain encrypted end to end.

## Problems solved
- Protects user alpha: predicted prices and directions never appear in plaintext on-chain.
- Prevents data leakage: the daily oracle price is stored encrypted, so public observers cannot infer it from storage or events.
- Enables fair settlement: points are awarded based on encrypted comparisons rather than off-chain judgment.
- Minimizes trust: even with a centralized oracle update, the rest of the logic is deterministic and verifiable on-chain.

## Advantages
- Strong privacy by default using Zama FHEVM and the relayer SDK.
- Simple daily cadence that reduces complexity and gas uncertainty.
- Clean separation between price recording and user claiming.
- Explicit support for two assets (ETH and BTC) with a fixed direction model.
- Frontend reads with viem and writes with ethers for predictable wallet behavior.

## Key features
- Encrypted prediction inputs: price and direction are encrypted client side.
- Daily encrypted price snapshots at UTC 00:00.
- Manual claim flow that awards encrypted points equal to the staked ETH amount.
- No mock data: all frontend views are backed by on-chain state.
- ABI sourced from deployment artifacts to guarantee consistency with the deployed contract.

## How it works
1. A user encrypts a target price and a direction, then stakes ETH via `submitPrediction`.
2. At UTC 00:00 each day, the owner calls `recordDailyPrice` with the encrypted price.
3. The next day, the user calls `claimReward` to receive encrypted points if the prediction was correct.

## Architecture
### Smart contracts
- Core contract: `contracts/OraclePrediction.sol`
- Tests: `test/OraclePrediction.ts`
- Tasks: `tasks/pricePrediction.ts`
- Deployment script: `deploy/deploy.ts`

### Frontend
- Location: `src/`
- React + Vite UI with RainbowKit wallet support.
- `viem` is used for contract reads and `ethers` for writes.
- Zama relayer SDK handles encryption, decryption, and ciphertext handles.
- Contract ABI is copied into the frontend as a TypeScript module; the source is `deployments/sepolia/OraclePrediction.json`.

### Oracle update
- The daily price is recorded on-chain at UTC 00:00.
- Only the owner updates the price, but the stored value stays encrypted.

## Tech stack
- Solidity + Hardhat + TypeScript
- Zama FHEVM
- React + Vite
- viem (reads) + ethers (writes)
- RainbowKit wallet UI
- @zama-fhe/relayer-sdk

## Repository layout
- `contracts/` smart contracts
- `deploy/` deployment scripts
- `deployments/` deployment artifacts and ABI outputs
- `tasks/` Hardhat tasks
- `test/` contract tests
- `src/` frontend application
- `docs/` Zama references

## Setup
### Prerequisites
- Node.js 20+
- npm
- `.env` with:
  - `INFURA_API_KEY` for Sepolia RPC access
  - `PRIVATE_KEY` for deployment (no mnemonic)
  - Optional: `ETHERSCAN_API_KEY`

### Install and build
```bash
npm install
npm run compile
npm run test
```

## Deployment
```bash
# Local (in-memory hardhat network)
npx hardhat deploy

# Sepolia (requires INFURA_API_KEY and PRIVATE_KEY)
npx hardhat deploy --network sepolia
```
Deployment artifacts are written to `deployments/`. Update the deployed contract address in the frontend config after deployment.

## Frontend usage
- Update the Sepolia contract address in `src/src/config/contracts.ts`.
- Ensure the frontend ABI matches the deployed contract by copying from `deployments/sepolia/OraclePrediction.json` into the frontend TypeScript ABI module.
- Start the dev server:
  ```bash
  cd src
  npm install
  npm run dev
  ```

## Security and privacy model
- All sensitive values are encrypted before reaching the chain.
- The contract stores encrypted predictions and encrypted daily prices.
- The relayer SDK manages encryption and decryption, keeping secrets client side.
- View functions avoid `msg.sender` to maintain deterministic reads.

## Limitations and assumptions
- The oracle update is centralized and must be performed daily at UTC 00:00.
- Rewards are denominated as encrypted points, not ETH transfers.
- Each prediction targets the next daily update only.

## Future plan
- Support more assets and configurable update schedules.
- Add optional staking tiers and dynamic reward multipliers.
- Integrate multiple oracle sources with quorum based price recording.
- Extend UI analytics with privacy friendly aggregates.
- Explore gas optimizations for batch claims and batch updates.

## License
MIT
