// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EventPOAP.sol";

/// @title POAPFactory — Deploys lightweight EventPOAP clones per event
/// @notice Uses ERC-1167 minimal proxies for gas-efficient deployment.
contract POAPFactory is Ownable {
    using Clones for address;

    // ──────────────────────── Storage ────────────────────────

    address public immutable implementation;

    /// @notice Arkiv eventId → deployed EventPOAP clone address
    mapping(string eventId => address poap) public eventPOAPs;

    /// @notice All deployed clone addresses
    address[] public allPOAPs;

    // ──────────────────────── Events ─────────────────────────

    event EventPOAPCreated(
        string indexed eventIdHash,
        string eventId,
        address poapAddress,
        address host
    );

    // ──────────────────────── Errors ─────────────────────────

    error EventPOAPAlreadyExists(string eventId);

    // ──────────────────────── Constructor ────────────────────

    constructor(address _implementation) Ownable(msg.sender) {
        implementation = _implementation;
    }

    // ──────────────────────── Factory ────────────────────────

    /// @notice Deploy a new EventPOAP clone for the given event.
    /// @param name   Collection name (e.g. "ETHDenver 2025 POAP")
    /// @param symbol Collection symbol (e.g. "ETHD25")
    /// @param _eventId  Arkiv entity key for the event
    /// @return clone Address of the newly deployed EventPOAP
    function createEventPOAP(
        string calldata name,
        string calldata symbol,
        string calldata _eventId
    ) external returns (address clone) {
        if (eventPOAPs[_eventId] != address(0)) {
            revert EventPOAPAlreadyExists(_eventId);
        }

        clone = implementation.clone();
        EventPOAP(clone).initialize(name, symbol, _eventId, msg.sender);

        eventPOAPs[_eventId] = clone;
        allPOAPs.push(clone);

        emit EventPOAPCreated(_eventId, _eventId, clone, msg.sender);
    }

    // ──────────────────────── Views ──────────────────────────

    /// @notice Get the POAP contract address for an event.
    function getEventPOAP(string calldata _eventId) external view returns (address) {
        return eventPOAPs[_eventId];
    }

    /// @notice Total number of POAP collections created.
    function totalEvents() external view returns (uint256) {
        return allPOAPs.length;
    }
}
