import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

function parseAsset(value: string): number {
  const normalized = value.toLowerCase();
  if (normalized === "eth") return 0;
  if (normalized === "btc") return 1;
  throw new Error("Asset must be eth or btc");
}

task("task:oracle:address", "Prints the OraclePrediction address").setAction(async (_args, hre) => {
  const { deployments } = hre;
  const deployment = await deployments.get("OraclePrediction");
  console.log(`OraclePrediction address: ${deployment.address}`);
});

task("task:oracle:record-price", "Owner-only helper to record the current day price")
  .addParam("asset", "Asset to record (eth|btc)")
  .addParam("price", "Plain price integer you want to encrypt (e.g. 275000 for $2,750.00)")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const asset = parseAsset(args.asset as string);
    const priceValue = BigInt(args.price);
    const deployment = await deployments.get("OraclePrediction");
    const [owner] = await ethers.getSigners();

    const input = await fhevm.createEncryptedInput(deployment.address, owner.address).add64(priceValue).encrypt();
    const contract = await ethers.getContractAt("OraclePrediction", deployment.address);

    const tx = await contract
      .connect(owner)
      .recordDailyPrice(asset, input.handles[0], input.inputProof);
    const receipt = await tx.wait();
    console.log(`Price recorded tx=${tx.hash} status=${receipt?.status}`);
  });

task("task:oracle:submit", "Submit a prediction for tomorrow")
  .addParam("asset", "Asset to predict (eth|btc)")
  .addParam("price", "Predicted price integer to encrypt")
  .addParam("direction", "higher or lower")
  .addParam("stake", "Stake amount in wei")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const asset = parseAsset(args.asset as string);
    const direction = (args.direction as string).toLowerCase();
    if (direction !== "higher" && direction !== "lower") {
      throw new Error("Direction must be higher or lower");
    }

    const deployment = await deployments.get("OraclePrediction");
    const [signer] = await ethers.getSigners();

    const buffer = fhevm.createEncryptedInput(deployment.address, signer.address);
    buffer.add64(BigInt(args.price));
    buffer.addBool(direction === "higher");

    const encrypted = await buffer.encrypt();
    const contract = await ethers.getContractAt("OraclePrediction", deployment.address);

    const tx = await contract
      .connect(signer)
      .submitPrediction(asset, encrypted.handles[0], encrypted.handles[1], encrypted.inputProof, {
        value: args.stake,
      });
    const receipt = await tx.wait();
    console.log(`Prediction submitted tx=${tx.hash} status=${receipt?.status}`);
  });

task("task:oracle:points", "Decrypt and print the caller (or provided address) points")
  .addOptionalParam("address", "Target address to decrypt points for")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = await deployments.get("OraclePrediction");
    const [caller] = await ethers.getSigners();
    const target = (args.address as string | undefined) ?? caller.address;
    const contract = await ethers.getContractAt("OraclePrediction", deployment.address);

    const encryptedPoints = await contract.getEncryptedPoints(target);
    if (encryptedPoints === ethers.ZeroHash) {
      console.log("No points stored yet.");
      return;
    }

    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPoints,
      deployment.address,
      caller
    );

    console.log(`Points for ${target}: ${clearPoints.toString()}`);
  });
