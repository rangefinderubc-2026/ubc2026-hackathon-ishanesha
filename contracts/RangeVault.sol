// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RangeVault {
    address public owner;

    struct Range {
        uint64 lower;          // USD, e.g. 63000
        uint64 upper;          // USD, e.g. 64500
        uint16 confidenceBps;  // target, e.g. 8000
        uint16 probInRangeBps; // what Gemini implies, e.g. 8120
        string geminiEvent;    // e.g. "BTC2611192200"
        uint64 updatedAt;
    }

    Range public current;
    uint256 public rebalanceCount;

    event RangeSet(uint64 lower, uint64 upper, uint16 confidenceBps, uint16 probInRangeBps, string geminiEvent);
    event Rebalanced(uint64 oldLower, uint64 oldUpper, uint64 newLower, uint64 newUpper, uint16 probInRangeBps, string reason);
    event ProtectionRecorded(string geminiOrderId, uint64 strike, uint256 costCents);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor() { owner = msg.sender; }

    function setRange(uint64 lower, uint64 upper, uint16 confidenceBps, uint16 probInRangeBps, string calldata geminiEvent) external onlyOwner {
        require(lower < upper, "bad range");
        current = Range(lower, upper, confidenceBps, probInRangeBps, geminiEvent, uint64(block.timestamp));
        emit RangeSet(lower, upper, confidenceBps, probInRangeBps, geminiEvent);
    }

    function rebalance(uint64 lower, uint64 upper, uint16 probInRangeBps, string calldata reason) external onlyOwner {
        require(lower < upper, "bad range");
        emit Rebalanced(current.lower, current.upper, lower, upper, probInRangeBps, reason);
        current.lower = lower;
        current.upper = upper;
        current.probInRangeBps = probInRangeBps;
        current.updatedAt = uint64(block.timestamp);
        rebalanceCount++;
    }

    function recordProtection(string calldata geminiOrderId, uint64 strike, uint256 costCents) external onlyOwner {
        emit ProtectionRecorded(geminiOrderId, strike, costCents);
    }

    function getRange() external view returns (Range memory) { return current; }
}
