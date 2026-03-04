// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title EventPOAP — Soulbound ERC-721 with gasless voucher minting
/// @notice Each clone represents one event's POAP collection.
///         The host signs EIP-712 vouchers so attendees receive NFTs without paying gas.
contract EventPOAP is
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    EIP712Upgradeable
{
    using ECDSA for bytes32;

    // ──────────────────────── Storage ────────────────────────

    string public eventId;
    uint256 private _nextTokenId;

    mapping(address attendee => bool) public hasMinted;
    mapping(uint256 nonce => bool) public usedNonces;

    // ──────────────────────── EIP-712 ────────────────────────

    bytes32 private constant MINT_VOUCHER_TYPEHASH =
        keccak256("MintVoucher(address attendee,string tokenURI,uint256 nonce)");

    // ──────────────────────── Events ─────────────────────────

    event POAPMinted(address indexed attendee, uint256 indexed tokenId, string tokenURI);

    // ──────────────────────── Errors ─────────────────────────

    error AlreadyMinted(address attendee);
    error NonceAlreadyUsed(uint256 nonce);
    error InvalidSignature();
    error SoulboundTransfer();

    // ──────────────────────── Init ───────────────────────────

    /// @notice Called once by the factory after cloning.
    function initialize(
        string calldata _name,
        string calldata _symbol,
        string calldata _eventId,
        address _host
    ) external initializer {
        __ERC721_init(_name, _symbol);
        __ERC721URIStorage_init();
        __Ownable_init(_host);
        __EIP712_init(_name, "1");

        eventId = _eventId;
        _nextTokenId = 1;
    }

    // ──────────────────────── Minting ────────────────────────

    /// @notice Mint with a voucher signed by the event host (gasless for attendee).
    /// @param attendee  Address receiving the POAP
    /// @param _tokenURI IPFS URI for the token metadata
    /// @param nonce     Unique nonce to prevent replay
    /// @param signature EIP-712 signature from the event host
    function mintWithVoucher(
        address attendee,
        string calldata _tokenURI,
        uint256 nonce,
        bytes calldata signature
    ) external {
        if (hasMinted[attendee]) revert AlreadyMinted(attendee);
        if (usedNonces[nonce]) revert NonceAlreadyUsed(nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                MINT_VOUCHER_TYPEHASH,
                attendee,
                keccak256(bytes(_tokenURI)),
                nonce
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (signer != owner()) revert InvalidSignature();

        usedNonces[nonce] = true;
        _mintPOAP(attendee, _tokenURI);
    }

    /// @notice Host can directly mint without a voucher (e.g. batch mint).
    function hostMint(
        address attendee,
        string calldata _tokenURI
    ) external onlyOwner {
        if (hasMinted[attendee]) revert AlreadyMinted(attendee);
        _mintPOAP(attendee, _tokenURI);
    }

    // ──────────────────────── Soulbound ──────────────────────

    /// @dev Blocks all transfers except minting (from == address(0)).
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransfer();
        }
        return super._update(to, tokenId, auth);
    }

    // ──────────────────────── Views ──────────────────────────

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ──────────────────────── Internal ───────────────────────

    function _mintPOAP(address attendee, string calldata _tokenURI) private {
        uint256 tokenId = _nextTokenId++;
        hasMinted[attendee] = true;

        _safeMint(attendee, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit POAPMinted(attendee, tokenId, _tokenURI);
    }
}
