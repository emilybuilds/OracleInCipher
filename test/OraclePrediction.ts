import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { OraclePrediction, OraclePrediction__factory } from "../types";

const Asset = {
  ETH: 0,
  BTC: 1,
};

describe("OraclePrediction", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let contract: OraclePrediction;
  let contractAddress: string;

  before(async function () {
    const signers = await ethers.getSigners();
    [deployer, alice, bob] = [signers[0], signers[1], signers[2]];
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const factory = (await ethers.getContractFactory("OraclePrediction")) as OraclePrediction__factory;
    contract = (await factory.deploy()) as OraclePrediction;
    contractAddress = await contract.getAddress();
  });

  async function encryptPrice(value: bigint, forAddress: string) {
    const buffer = fhevm.createEncryptedInput(contractAddress, forAddress);
    buffer.add64(value);
    return buffer.encrypt();
  }

  async function submitPrediction({
    signer,
    asset,
    price,
    expectHigher,
    stake,
  }: {
    signer: HardhatEthersSigner;
    asset: number;
    price: bigint;
    expectHigher: boolean;
    stake: bigint;
  }) {
    const buffer = fhevm.createEncryptedInput(contractAddress, signer.address);
    buffer.add64(price);
    buffer.addBool(expectHigher);
    const encrypted = await buffer.encrypt();

    await contract
      .connect(signer)
      .submitPrediction(asset, encrypted.handles[0], encrypted.handles[1], encrypted.inputProof, {
        value: stake,
      });
  }

  it("rewards a correct higher prediction with encrypted points", async function () {
    const targetDay = (await contract.currentDay()) + 1n;
    const stake = ethers.parseEther("1");

    await submitPrediction({
      signer: alice,
      asset: Asset.ETH,
      price: 2_500_00n,
      expectHigher: true,
      stake,
    });

    await time.increase(24 * 60 * 60 + 5);

    const encryptedPrice = await encryptPrice(2_600_00n, deployer.address);
    await contract.connect(deployer).recordDailyPrice(Asset.ETH, encryptedPrice.handles[0], encryptedPrice.inputProof);

    await contract.connect(alice).claimReward(Asset.ETH, targetDay);

    const encryptedPoints = await contract.getEncryptedPoints(alice.address);
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPoints,
      contractAddress,
      alice
    );

    expect(clearPoints).to.eq(stake);
  });

  it("keeps points unchanged for a wrong direction prediction", async function () {
    const targetDay = (await contract.currentDay()) + 1n;
    const stake = ethers.parseEther("0.5");

    await submitPrediction({
      signer: bob,
      asset: Asset.BTC,
      price: 60_000_00n,
      expectHigher: false,
      stake,
    });

    await time.increase(24 * 60 * 60 + 5);

    const encryptedPrice = await encryptPrice(61_500_00n, deployer.address);
    await contract.connect(deployer).recordDailyPrice(Asset.BTC, encryptedPrice.handles[0], encryptedPrice.inputProof);

    await contract.connect(bob).claimReward(Asset.BTC, targetDay);

    const encryptedPoints = await contract.getEncryptedPoints(bob.address);
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPoints,
      contractAddress,
      bob
    );

    expect(clearPoints).to.eq(0n);
  });

  it("prevents recording a price twice for the same day", async function () {
    await time.increase(24 * 60 * 60 + 3);
    const encryptedPrice = await encryptPrice(2_400_00n, deployer.address);

    await contract.connect(deployer).recordDailyPrice(Asset.ETH, encryptedPrice.handles[0], encryptedPrice.inputProof);

    await expect(
      contract.connect(deployer).recordDailyPrice(Asset.ETH, encryptedPrice.handles[0], encryptedPrice.inputProof)
    ).to.be.revertedWithCustomError(contract, "PriceAlreadyRecorded");
  });
});
