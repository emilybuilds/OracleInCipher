// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEbool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract OraclePrediction is ZamaEthereumConfig {
    using FHE for ebool;
    using FHE for euint64;

    enum Asset {
        ETH,
        BTC
    }

    struct Prediction {
        euint64 targetPrice;
        ebool expectHigher;
        uint256 stake;
        uint256 targetDay;
        bool claimed;
    }

    struct DailyPrice {
        euint64 price;
        uint256 timestamp;
        bool recorded;
    }

    mapping(Asset => mapping(uint256 => DailyPrice)) private dailyPrices;
    mapping(Asset => mapping(uint256 => mapping(address => Prediction))) private predictions;
    mapping(address => euint64) private encryptedPoints;

    address public owner;

    event PredictionSubmitted(address indexed user, Asset indexed asset, uint256 indexed targetDay, uint256 stake);
    event DailyPriceRecorded(Asset indexed asset, uint256 indexed day, uint256 timestamp);
    event PredictionClaimed(
        address indexed user,
        Asset indexed asset,
        uint256 indexed day,
        bytes32 outcomeHandle,
        uint256 reward,
        bytes32 totalPoints
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error PriceAlreadyRecorded();
    error PredictionExists();
    error NothingToClaim();
    error PriceNotReady();
    error StakeTooLow();
    error StakeTooLarge();
    error InvalidOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert InvalidOwner();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function getDailyPrice(
        Asset asset,
        uint256 day
    ) external view returns (euint64 price, uint256 timestamp, bool recorded) {
        DailyPrice storage stored = dailyPrices[asset][day];
        return (stored.price, stored.timestamp, stored.recorded);
    }

    function getUserPrediction(
        address user,
        Asset asset,
        uint256 day
    ) external view returns (euint64 price, ebool expectHigher, uint256 stake, bool claimed, uint256 targetDay) {
        Prediction storage stored = predictions[asset][day][user];
        return (stored.targetPrice, stored.expectHigher, stored.stake, stored.claimed, stored.targetDay);
    }

    function getEncryptedPoints(address user) external view returns (euint64) {
        return encryptedPoints[user];
    }

    function submitPrediction(
        Asset asset,
        externalEuint64 predictedPrice,
        externalEbool expectHigher,
        bytes calldata inputProof
    ) external payable returns (uint256 targetDay) {
        if (msg.value == 0) {
            revert StakeTooLow();
        }
        if (msg.value > type(uint64).max) {
            revert StakeTooLarge();
        }

        targetDay = currentDay() + 1;

        Prediction storage stored = predictions[asset][targetDay][msg.sender];
        if (stored.stake != 0 && !stored.claimed) {
            revert PredictionExists();
        }

        euint64 price = FHE.fromExternal(predictedPrice, inputProof);
        price = FHE.allowThis(price);
        price = FHE.allow(price, msg.sender);

        ebool direction = FHE.fromExternal(expectHigher, inputProof);
        direction = FHE.allowThis(direction);
        direction = FHE.allow(direction, msg.sender);

        stored.targetPrice = price;
        stored.expectHigher = direction;
        stored.stake = msg.value;
        stored.targetDay = targetDay;
        stored.claimed = false;

        emit PredictionSubmitted(msg.sender, asset, targetDay, msg.value);
    }

    function recordDailyPrice(
        Asset asset,
        externalEuint64 priceHandle,
        bytes calldata inputProof
    ) external onlyOwner returns (uint256 dayRecorded) {
        dayRecorded = currentDay();

        DailyPrice storage stored = dailyPrices[asset][dayRecorded];
        if (stored.recorded) {
            revert PriceAlreadyRecorded();
        }

        euint64 price = FHE.fromExternal(priceHandle, inputProof);
        price = FHE.allowThis(price);
        price = FHE.makePubliclyDecryptable(price);

        stored.price = price;
        stored.timestamp = block.timestamp;
        stored.recorded = true;

        emit DailyPriceRecorded(asset, dayRecorded, block.timestamp);
    }

    function claimReward(Asset asset, uint256 day) external {
        Prediction storage stored = predictions[asset][day][msg.sender];
        if (stored.stake == 0 || stored.claimed || stored.targetDay != day) {
            revert NothingToClaim();
        }

        DailyPrice storage priceData = dailyPrices[asset][day];
        if (!priceData.recorded) {
            revert PriceNotReady();
        }

        stored.claimed = true;

        ebool isHigher = FHE.gt(priceData.price, stored.targetPrice);
        ebool isLower = FHE.lt(priceData.price, stored.targetPrice);
        ebool outcome = FHE.select(stored.expectHigher, isHigher, isLower);
        outcome = FHE.allow(outcome, msg.sender);
        outcome = FHE.allowThis(outcome);

        uint64 rewardValue = uint64(stored.stake);
        euint64 reward = FHE.asEuint64(rewardValue);
        reward = FHE.allow(reward, msg.sender);
        reward = FHE.allowThis(reward);

        euint64 currentPoints = encryptedPoints[msg.sender];
        if (!FHE.isInitialized(currentPoints)) {
            currentPoints = FHE.asEuint64(0);
        } else {
            currentPoints = FHE.allow(currentPoints, msg.sender);
            currentPoints = FHE.allowThis(currentPoints);
        }

        euint64 updatedPoints = FHE.select(outcome, FHE.add(currentPoints, reward), currentPoints);
        updatedPoints = FHE.allow(updatedPoints, msg.sender);
        updatedPoints = FHE.allowThis(updatedPoints);

        encryptedPoints[msg.sender] = updatedPoints;

        emit PredictionClaimed(
            msg.sender,
            asset,
            day,
            ebool.unwrap(outcome),
            stored.stake,
            euint64.unwrap(updatedPoints)
        );
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidOwner();
        }
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
