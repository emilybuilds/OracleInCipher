import { useMemo, useState } from 'react';
import { Contract, ethers } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { zeroAddress, zeroHash, type Address } from 'viem';

import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import '../styles/PredictionApp.css';

type PriceResult = readonly [string, bigint, boolean] | undefined;
type PredictionResult = readonly [string, string, bigint, boolean, bigint] | undefined;

const assetOptions = [
  { label: 'ETH', value: 0, accent: '#6dd3ff' },
  { label: 'BTC', value: 1, accent: '#ffb347' },
] as const;

function formatUsdFromCents(value: bigint | number | undefined) {
  if (value === undefined) return '—';
  const cents = typeof value === 'bigint' ? Number(value) : value;
  const dollars = cents / 100;
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDay(day: bigint | number) {
  const epochMs = (typeof day === 'bigint' ? Number(day) : day) * 86400 * 1000;
  const date = new Date(epochMs);
  return date.toUTCString().split(' GMT')[0];
}

function isValidAddress(value: string | undefined): value is Address {
  return !!value && value.startsWith('0x') && value.length === 42;
}

export function PredictionApp() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading } = useZamaInstance();

  const [contractAddressInput, setContractAddressInput] = useState(CONTRACT_ADDRESS);
  const [predictionForm, setPredictionForm] = useState({
    asset: 0,
    price: '',
    direction: 'higher',
    stake: '0.01',
  });
  const [priceForm, setPriceForm] = useState({
    asset: 0,
    price: '',
  });
  const [txMessage, setTxMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [decryptedPrices, setDecryptedPrices] = useState<Record<number, string>>({});
  const [decryptedPredictions, setDecryptedPredictions] = useState<Record<string, { price: string; direction: string }>>(
    {},
  );
  const [decryptedPoints, setDecryptedPoints] = useState<string | null>(null);

  const resolvedContract = useMemo(
    () => (isValidAddress(contractAddressInput) ? contractAddressInput : undefined),
    [contractAddressInput],
  );
  const queryAddress = (resolvedContract ?? zeroAddress) as Address;
  const queriesEnabled = Boolean(resolvedContract);

  const { data: ownerAddress } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'owner',
    query: { enabled: queriesEnabled },
  });

  const { data: currentDayData } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'currentDay',
    query: { enabled: queriesEnabled },
  });

  const currentDay = currentDayData ? BigInt(currentDayData as bigint) : 0n;
  const nextDay = currentDay + 1n;

  const { data: todaysEthPrice } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getDailyPrice',
    args: [assetOptions[0].value, currentDay],
    query: { enabled: queriesEnabled && currentDayData !== undefined },
  });

  const { data: todaysBtcPrice } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getDailyPrice',
    args: [assetOptions[1].value, currentDay],
    query: { enabled: queriesEnabled && currentDayData !== undefined },
  });

  const { data: ethPredictionToday } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getUserPrediction',
    args: [address ?? zeroAddress, assetOptions[0].value, currentDay],
    query: { enabled: queriesEnabled && !!address && currentDayData !== undefined },
  });

  const { data: btcPredictionToday } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getUserPrediction',
    args: [address ?? zeroAddress, assetOptions[1].value, currentDay],
    query: { enabled: queriesEnabled && !!address && currentDayData !== undefined },
  });

  const { data: ethPredictionNext } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getUserPrediction',
    args: [address ?? zeroAddress, assetOptions[0].value, nextDay],
    query: { enabled: queriesEnabled && !!address && currentDayData !== undefined },
  });

  const { data: btcPredictionNext } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getUserPrediction',
    args: [address ?? zeroAddress, assetOptions[1].value, nextDay],
    query: { enabled: queriesEnabled && !!address && currentDayData !== undefined },
  });

  const { data: encryptedPoints } = useReadContract({
    address: queryAddress,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedPoints',
    args: [address ?? zeroAddress],
    query: { enabled: queriesEnabled && !!address },
  });

  const isOwner = ownerAddress && address && ownerAddress.toLowerCase() === address.toLowerCase();

  const formatStake = (stake: bigint) => `${ethers.formatEther(stake)} ETH`;

  const parsePriceInput = (input: string) => {
    const numeric = Number(input);
    if (Number.isNaN(numeric) || numeric <= 0) {
      throw new Error('Enter a valid price');
    }
    return BigInt(Math.round(numeric * 100));
  };

  const handlePredict = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolvedContract || !address || !instance || !signerPromise) {
      setTxMessage('Connect wallet and wait for encryption to be ready.');
      return;
    }

    try {
      setBusy(true);
      setTxMessage('Encrypting your prediction...');
      const priceValue = parsePriceInput(predictionForm.price);
      const stakeValue = ethers.parseEther(predictionForm.stake || '0');
      const buffer = instance.createEncryptedInput(resolvedContract, address);
      buffer.add64(priceValue);
      buffer.addBool(predictionForm.direction === 'higher');
      const encrypted = await buffer.encrypt();
      const signer = await signerPromise;

      const contract = new Contract(resolvedContract, CONTRACT_ABI, signer);
      const tx = await contract.submitPrediction(
        predictionForm.asset,
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof,
        { value: stakeValue },
      );
      await tx.wait();
      setTxMessage('Prediction submitted for tomorrow’s price.');
    } catch (error) {
      console.error(error);
      setTxMessage(error instanceof Error ? error.message : 'Failed to submit prediction');
    } finally {
      setBusy(false);
    }
  };

  const handleRecordPrice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolvedContract || !address || !instance || !signerPromise) {
      setTxMessage('Connect wallet and wait for encryption to be ready.');
      return;
    }

    try {
      setBusy(true);
      setTxMessage('Encrypting closing price...');
      const priceValue = parsePriceInput(priceForm.price);
      const buffer = instance.createEncryptedInput(resolvedContract, address);
      buffer.add64(priceValue);
      const encrypted = await buffer.encrypt();
      const signer = await signerPromise;
      const contract = new Contract(resolvedContract, CONTRACT_ABI, signer);
      const tx = await contract.recordDailyPrice(priceForm.asset, encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
      setTxMessage('Recorded encrypted price for today.');
    } catch (error) {
      console.error(error);
      setTxMessage(error instanceof Error ? error.message : 'Failed to record price');
    } finally {
      setBusy(false);
    }
  };

  const claimReward = async (asset: number, prediction: PredictionResult) => {
    if (!resolvedContract || !address || !signerPromise || !prediction) {
      setTxMessage('Prediction is not ready to claim.');
      return;
    }
    const [, , stake, claimed, targetDay] = prediction;
    if (stake === 0n || claimed) {
      setTxMessage('Nothing to claim for this market.');
      return;
    }

    try {
      setBusy(true);
      setTxMessage('Claiming encrypted points...');
      const signer = await signerPromise;
      const contract = new Contract(resolvedContract, CONTRACT_ABI, signer);
      const tx = await contract.claimReward(asset, targetDay);
      await tx.wait();
      setTxMessage('Claim submitted. Points updated.');
    } catch (error) {
      console.error(error);
      setTxMessage(error instanceof Error ? error.message : 'Failed to claim reward');
    } finally {
      setBusy(false);
    }
  };

  const decryptPrice = async (asset: number, priceData: PriceResult) => {
    if (!instance || !priceData) return;
    const [priceHandle] = priceData;
    if (!priceHandle || priceHandle === zeroHash) {
      setTxMessage('No recorded price to decrypt yet.');
      return;
    }

    try {
      setTxMessage('Requesting public decryption...');
      const result = await instance.publicDecrypt([priceHandle]);
      const value = result.clearValues[priceHandle] as bigint;
      setDecryptedPrices((prev) => ({
        ...prev,
        [asset]: formatUsdFromCents(value),
      }));
      setTxMessage('');
    } catch (error) {
      console.error(error);
      setTxMessage('Failed to decrypt price');
    }
  };

  const decryptPrediction = async (asset: number, prediction: PredictionResult) => {
    if (!instance || !address || !prediction || !resolvedContract || !signerPromise) {
      setTxMessage('Prediction cannot be decrypted yet.');
      return;
    }

    const [priceHandle, directionHandle, stake] = prediction;
    if (!priceHandle || priceHandle === zeroHash || stake === 0n) {
      setTxMessage('Submit a prediction first.');
      return;
    }

    try {
      setTxMessage('Decrypting your encrypted inputs...');
      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '3';
      const eip712 = instance.createEIP712(keypair.publicKey, [resolvedContract], startTimestamp, durationDays);
      const signer = await signerPromise;
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const decrypted = await instance.userDecrypt(
        [
          { handle: priceHandle, contractAddress: resolvedContract },
          { handle: directionHandle, contractAddress: resolvedContract },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        [resolvedContract],
        address,
        startTimestamp,
        durationDays,
      );

      const price = decrypted[priceHandle] as bigint;
      const direction = decrypted[directionHandle] as boolean;
      setDecryptedPredictions((prev) => ({
        ...prev,
        [`${asset}-${prediction[4].toString()}`]: {
          price: formatUsdFromCents(price),
          direction: direction ? 'Higher' : 'Lower',
        },
      }));
      setTxMessage('');
    } catch (error) {
      console.error(error);
      setTxMessage('Failed to decrypt your prediction');
    }
  };

  const decryptPointsTotal = async () => {
    if (!instance || !address || !encryptedPoints || !resolvedContract || !signerPromise) {
      setTxMessage('No points to decrypt yet.');
      return;
    }
    if (encryptedPoints === zeroHash) {
      setDecryptedPoints('0');
      return;
    }

    try {
      setTxMessage('Decrypting your points balance...');
      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '3';
      const eip712 = instance.createEIP712(keypair.publicKey, [resolvedContract], startTimestamp, durationDays);
      const signer = await signerPromise;
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const decrypted = await instance.userDecrypt(
        [{ handle: encryptedPoints, contractAddress: resolvedContract }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        [resolvedContract],
        address,
        startTimestamp,
        durationDays,
      );

      const points = decrypted[encryptedPoints] as bigint;
      setDecryptedPoints(`${ethers.formatEther(points)} pts`);
      setTxMessage('');
    } catch (error) {
      console.error(error);
      setTxMessage('Failed to decrypt points');
    }
  };

  const renderPredictionCard = (title: string, asset: number, data: PredictionResult, dayLabel: string) => {
    if (!data || (data[2] === 0n && data[0] === zeroHash)) {
      return (
        <div className="prediction-card muted">
          <p className="small-label">{title}</p>
          <p className="muted-text">No prediction stored.</p>
        </div>
      );
    }

    const [priceHandle, , stake, claimed, targetDay] = data;
    const decryptedKey = `${asset}-${targetDay.toString()}`;
    const decrypted = decryptedPredictions[decryptedKey];
    const isFuture = targetDay > currentDay;

    return (
      <div className="prediction-card">
        <p className="small-label">{title}</p>
        <div className="prediction-row">
          <span className="muted-text">Target day</span>
          <strong>{dayLabel}</strong>
        </div>
        <div className="prediction-row">
          <span className="muted-text">Stake</span>
          <strong>{stake === 0n ? '—' : formatStake(stake)}</strong>
        </div>
        <div className="prediction-row">
          <span className="muted-text">Encrypted price</span>
          <code className="cipher">{priceHandle.slice(0, 10)}...</code>
        </div>
        {decrypted ? (
          <div className="decrypted">
            <div>
              <p className="muted-text">Predicted price</p>
              <strong>{decrypted.price}</strong>
            </div>
            <div>
              <p className="muted-text">Direction</p>
              <strong>{decrypted.direction}</strong>
            </div>
          </div>
        ) : (
          <button className="ghost-button" onClick={() => decryptPrediction(asset, data)} disabled={busy || zamaLoading}>
            Decrypt my prediction
          </button>
        )}
        <div className="prediction-actions">
          <button
            className="primary-button"
            onClick={() => claimReward(asset, data)}
            disabled={busy || claimed || stake === 0n || isFuture}
          >
            {claimed ? 'Already claimed' : isFuture ? 'Awaiting settlement' : 'Claim encrypted points'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="prediction-page">
      <Header />

      <div className="status-bar">
        <div>
          <p className="muted-text">Contract address</p>
          <div className="address-input">
            <input
              value={contractAddressInput}
              onChange={(e) => setContractAddressInput(e.target.value.trim())}
              placeholder="0x..."
            />
            <span className={`status-dot ${queriesEnabled ? 'ok' : 'warn'}`} />
          </div>
          <p className="muted-text">
            Deployed owner: {ownerAddress ?? 'unknown'} {isOwner ? '(you)' : ''}
          </p>
        </div>
        <div>
          <p className="muted-text">Oracle day index</p>
          <h3>{currentDay.toString()}</h3>
          <p className="muted-text">{formatDay(currentDay)}</p>
        </div>
        <div>
          <p className="muted-text">Zama Relayer</p>
          <h3>{zamaLoading ? 'Loading...' : 'Ready'}</h3>
          <p className="muted-text">Inputs are encrypted client-side</p>
        </div>
      </div>

      <div className="price-grid">
        {[{ data: todaysEthPrice, option: assetOptions[0] }, { data: todaysBtcPrice, option: assetOptions[1] }].map(
          ({ data, option }) => {
            const price = data as PriceResult;
            const decrypted = decryptedPrices[option.value];
            const recorded = price ? price[2] : false;
            const timestamp =
              price && recorded ? new Date(Number(price[1]) * 1000).toLocaleString() : 'Waiting for update';
            return (
              <div key={option.value} className="price-card" style={{ borderColor: option.accent }}>
                <div className="price-card__header">
                  <div>
                    <p className="muted-text">Today · {option.label}</p>
                    <h2>{decrypted ?? (recorded ? 'Encrypted price' : 'No price yet')}</h2>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => decryptPrice(option.value, price)}
                    disabled={busy || zamaLoading || !recorded}
                  >
                    Decrypt
                  </button>
                </div>
                <p className="muted-text">{timestamp}</p>
              </div>
            );
          },
        )}
      </div>

      <div className="forms-grid">
        <form className="panel" onSubmit={handlePredict}>
          <div className="panel-header">
            <div>
              <p className="muted-text">Tomorrow’s encrypted bet</p>
              <h3>Submit a prediction</h3>
            </div>
            <span className="pill">Target day {nextDay.toString()}</span>
          </div>
          <div className="field-row">
            <label>Asset</label>
            <div className="chip-row">
              {assetOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`chip ${predictionForm.asset === option.value ? 'chip--active' : ''}`}
                  onClick={() => setPredictionForm((prev) => ({ ...prev, asset: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label>Predicted price (USD)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={predictionForm.price}
              onChange={(e) => setPredictionForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="e.g. 2650.25"
            />
          </div>
          <div className="field-row">
            <label>Direction</label>
            <div className="chip-row">
              {['higher', 'lower'].map((dir) => (
                <button
                  type="button"
                  key={dir}
                  className={`chip ${predictionForm.direction === dir ? 'chip--active' : ''}`}
                  onClick={() => setPredictionForm((prev) => ({ ...prev, direction: dir }))}
                >
                  {dir === 'higher' ? 'Above target' : 'Below target'}
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label>Stake (ETH)</label>
            <input
              required
              type="number"
              min="0.0001"
              step="0.0001"
              value={predictionForm.stake}
              onChange={(e) => setPredictionForm((prev) => ({ ...prev, stake: e.target.value }))}
            />
            <p className="muted-text">If correct, you’ll receive the same amount in encrypted points.</p>
          </div>
          <button className="primary-button" type="submit" disabled={busy || zamaLoading || !queriesEnabled}>
            {busy ? 'Submitting...' : 'Submit encrypted prediction'}
          </button>
        </form>

        <form className="panel" onSubmit={handleRecordPrice}>
          <div className="panel-header">
            <div>
              <p className="muted-text">Daily settlement</p>
              <h3>Record today’s price</h3>
            </div>
            <span className="pill pill--soft">{isOwner ? 'You are the owner' : 'Owner-only action'}</span>
          </div>
          <div className="field-row">
            <label>Asset</label>
            <div className="chip-row">
              {assetOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`chip ${priceForm.asset === option.value ? 'chip--active' : ''}`}
                  onClick={() => setPriceForm((prev) => ({ ...prev, asset: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label>Final price (USD)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={priceForm.price}
              onChange={(e) => setPriceForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="e.g. 2625.13"
            />
            <p className="muted-text">Encrypted on the client using Zama and stored privately on-chain.</p>
          </div>
          <button className="secondary-button" type="submit" disabled={busy || zamaLoading || !queriesEnabled}>
            {busy ? 'Recording...' : 'Record encrypted price'}
          </button>
        </form>
      </div>

      <div className="panels-stack">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="muted-text">Claimable results</p>
              <h3>Today’s outcomes</h3>
            </div>
            <span className="pill">Day {currentDay.toString()}</span>
          </div>
          <div className="prediction-grid">
            {renderPredictionCard(`ETH · ${formatDay(currentDay)}`, assetOptions[0].value, ethPredictionToday, formatDay(currentDay))}
            {renderPredictionCard(`BTC · ${formatDay(currentDay)}`, assetOptions[1].value, btcPredictionToday, formatDay(currentDay))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="muted-text">Queued for tomorrow</p>
              <h3>Upcoming predictions</h3>
            </div>
            <span className="pill">Day {nextDay.toString()}</span>
          </div>
          <div className="prediction-grid">
            {renderPredictionCard(
              `ETH · ${formatDay(nextDay)}`,
              assetOptions[0].value,
              ethPredictionNext,
              formatDay(nextDay),
            )}
            {renderPredictionCard(
              `BTC · ${formatDay(nextDay)}`,
              assetOptions[1].value,
              btcPredictionNext,
              formatDay(nextDay),
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="muted-text">Encrypted balance</p>
              <h3>Your points</h3>
            </div>
            <span className="pill pill--soft">Encrypted on-chain</span>
          </div>
          <div className="points-row">
            <div>
              <p className="muted-text">Encrypted handle</p>
              <code className="cipher">
                {encryptedPoints && encryptedPoints !== zeroHash ? `${encryptedPoints.slice(0, 18)}...` : 'Not created yet'}
              </code>
            </div>
            <div className="points-actions">
              <button className="ghost-button" onClick={decryptPointsTotal} disabled={busy || zamaLoading}>
                Decrypt points
              </button>
              <h3>{decryptedPoints ?? 'Locked'}</h3>
            </div>
          </div>
        </div>
      </div>

      {txMessage && <div className="toast">{txMessage}</div>}
    </div>
  );
}
