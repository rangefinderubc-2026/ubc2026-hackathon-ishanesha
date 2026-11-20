export const vaultAbi = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "geminiOrderId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "strike",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "costCents",
				"type": "uint256"
			}
		],
		"name": "ProtectionRecorded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "lower",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "upper",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint16",
				"name": "confidenceBps",
				"type": "uint16"
			},
			{
				"indexed": false,
				"internalType": "uint16",
				"name": "probInRangeBps",
				"type": "uint16"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "geminiEvent",
				"type": "string"
			}
		],
		"name": "RangeSet",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "oldLower",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "oldUpper",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "newLower",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "newUpper",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint16",
				"name": "probInRangeBps",
				"type": "uint16"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "reason",
				"type": "string"
			}
		],
		"name": "Rebalanced",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "current",
		"outputs": [
			{
				"internalType": "uint64",
				"name": "lower",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "upper",
				"type": "uint64"
			},
			{
				"internalType": "uint16",
				"name": "confidenceBps",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "probInRangeBps",
				"type": "uint16"
			},
			{
				"internalType": "string",
				"name": "geminiEvent",
				"type": "string"
			},
			{
				"internalType": "uint64",
				"name": "updatedAt",
				"type": "uint64"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getRange",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint64",
						"name": "lower",
						"type": "uint64"
					},
					{
						"internalType": "uint64",
						"name": "upper",
						"type": "uint64"
					},
					{
						"internalType": "uint16",
						"name": "confidenceBps",
						"type": "uint16"
					},
					{
						"internalType": "uint16",
						"name": "probInRangeBps",
						"type": "uint16"
					},
					{
						"internalType": "string",
						"name": "geminiEvent",
						"type": "string"
					},
					{
						"internalType": "uint64",
						"name": "updatedAt",
						"type": "uint64"
					}
				],
				"internalType": "struct RangeVault.Range",
				"name": "",
				"type": "tuple"
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
				"internalType": "uint64",
				"name": "lower",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "upper",
				"type": "uint64"
			},
			{
				"internalType": "uint16",
				"name": "probInRangeBps",
				"type": "uint16"
			},
			{
				"internalType": "string",
				"name": "reason",
				"type": "string"
			}
		],
		"name": "rebalance",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "rebalanceCount",
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
				"internalType": "string",
				"name": "geminiOrderId",
				"type": "string"
			},
			{
				"internalType": "uint64",
				"name": "strike",
				"type": "uint64"
			},
			{
				"internalType": "uint256",
				"name": "costCents",
				"type": "uint256"
			}
		],
		"name": "recordProtection",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "lower",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "upper",
				"type": "uint64"
			},
			{
				"internalType": "uint16",
				"name": "confidenceBps",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "probInRangeBps",
				"type": "uint16"
			},
			{
				"internalType": "string",
				"name": "geminiEvent",
				"type": "string"
			}
		],
		"name": "setRange",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
] as const;