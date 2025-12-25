// OraclePrediction contract configuration (fill CONTRACT_ADDRESS with the Sepolia deployment address)
export const CONTRACT_ADDRESS = '0x7650B4Dc243276707d9673FC1D02AacE3762F2fd';

// Generated ABI from deployments/sepolia/OraclePrediction.json
export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NothingToClaim",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PredictionExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceAlreadyRecorded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceNotReady",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StakeTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StakeTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "day",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "DailyPriceRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "day",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "outcomeHandle",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "reward",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "totalPoints",
        "type": "bytes32"
      }
    ],
    "name": "PredictionClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "targetDay",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stake",
        "type": "uint256"
      }
    ],
    "name": "PredictionSubmitted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "day",
        "type": "uint256"
      }
    ],
    "name": "claimReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentDay",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "day",
        "type": "uint256"
      }
    ],
    "name": "getDailyPrice",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "price",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "recorded",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getEncryptedPoints",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "day",
        "type": "uint256"
      }
    ],
    "name": "getUserPrediction",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "price",
        "type": "bytes32"
      },
      {
        "internalType": "ebool",
        "name": "expectHigher",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "stake",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "claimed",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "targetDay",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "externalEuint64",
        "name": "priceHandle",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "recordDailyPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "dayRecorded",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum OraclePrediction.Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "externalEuint64",
        "name": "predictedPrice",
        "type": "bytes32"
      },
      {
        "internalType": "externalEbool",
        "name": "expectHigher",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "submitPrediction",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "targetDay",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
