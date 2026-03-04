import { expect } from "chai";
import { ethers } from "hardhat";
import { EventPOAP, POAPFactory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("POAP System", function () {
  let implementation: EventPOAP;
  let factory: POAPFactory;
  let deployer: HardhatEthersSigner;
  let host: HardhatEthersSigner;
  let attendee1: HardhatEthersSigner;
  let attendee2: HardhatEthersSigner;

  const EVENT_ID = "event-abc-123";
  const EVENT_NAME = "ETHDenver 2025 POAP";
  const EVENT_SYMBOL = "ETHD25";
  const TOKEN_URI = "ipfs://QmTestHash/metadata.json";

  beforeEach(async function () {
    [deployer, host, attendee1, attendee2] = await ethers.getSigners();

    const EventPOAP = await ethers.getContractFactory("EventPOAP");
    implementation = await EventPOAP.deploy();
    await implementation.waitForDeployment();

    const POAPFactory = await ethers.getContractFactory("POAPFactory");
    factory = await POAPFactory.deploy(await implementation.getAddress());
    await factory.waitForDeployment();
  });

  // ──────────────── Factory Tests ────────────────

  describe("POAPFactory", function () {
    it("should create a new EventPOAP clone", async function () {
      const tx = await factory.connect(host).createEventPOAP(EVENT_NAME, EVENT_SYMBOL, EVENT_ID);
      const receipt = await tx.wait();

      const cloneAddress = await factory.getEventPOAP(EVENT_ID);
      expect(cloneAddress).to.not.equal(ethers.ZeroAddress);
      expect(await factory.totalEvents()).to.equal(1);
    });

    it("should revert when creating duplicate event POAP", async function () {
      await factory.connect(host).createEventPOAP(EVENT_NAME, EVENT_SYMBOL, EVENT_ID);
      await expect(
        factory.connect(host).createEventPOAP(EVENT_NAME, EVENT_SYMBOL, EVENT_ID)
      ).to.be.revertedWithCustomError(factory, "EventPOAPAlreadyExists");
    });

    it("should allow different hosts to create different events", async function () {
      await factory.connect(host).createEventPOAP("Event A", "EVA", "event-a");
      await factory.connect(attendee1).createEventPOAP("Event B", "EVB", "event-b");
      expect(await factory.totalEvents()).to.equal(2);
    });

    it("should track all deployed clones", async function () {
      await factory.connect(host).createEventPOAP("Event A", "EVA", "event-a");
      await factory.connect(host).createEventPOAP("Event B", "EVB", "event-b");

      const addr0 = await factory.allPOAPs(0);
      const addr1 = await factory.allPOAPs(1);
      expect(addr0).to.not.equal(addr1);
    });
  });

  // ──────────────── EventPOAP Clone Tests ────────────────

  describe("EventPOAP", function () {
    let poap: EventPOAP;

    beforeEach(async function () {
      await factory.connect(host).createEventPOAP(EVENT_NAME, EVENT_SYMBOL, EVENT_ID);
      const cloneAddress = await factory.getEventPOAP(EVENT_ID);
      poap = await ethers.getContractAt("EventPOAP", cloneAddress);
    });

    it("should be initialized correctly", async function () {
      expect(await poap.name()).to.equal(EVENT_NAME);
      expect(await poap.symbol()).to.equal(EVENT_SYMBOL);
      expect(await poap.eventId()).to.equal(EVENT_ID);
      expect(await poap.owner()).to.equal(host.address);
    });

    it("should not allow re-initialization", async function () {
      await expect(
        poap.initialize("Hack", "HCK", "hack", deployer.address)
      ).to.be.revertedWithCustomError(poap, "InvalidInitialization");
    });

    // ──── Host Mint ────

    describe("hostMint", function () {
      it("should allow host to mint directly", async function () {
        await expect(poap.connect(host).hostMint(attendee1.address, TOKEN_URI))
          .to.emit(poap, "POAPMinted")
          .withArgs(attendee1.address, 1, TOKEN_URI);

        expect(await poap.ownerOf(1)).to.equal(attendee1.address);
        expect(await poap.tokenURI(1)).to.equal(TOKEN_URI);
        expect(await poap.totalSupply()).to.equal(1);
      });

      it("should reject non-host minting", async function () {
        await expect(
          poap.connect(attendee1).hostMint(attendee1.address, TOKEN_URI)
        ).to.be.revertedWithCustomError(poap, "OwnableUnauthorizedAccount");
      });

      it("should reject duplicate mint for same attendee", async function () {
        await poap.connect(host).hostMint(attendee1.address, TOKEN_URI);
        await expect(
          poap.connect(host).hostMint(attendee1.address, TOKEN_URI)
        ).to.be.revertedWithCustomError(poap, "AlreadyMinted");
      });
    });

    // ──── Voucher Mint ────

    describe("mintWithVoucher", function () {
      async function signVoucher(
        signer: HardhatEthersSigner,
        attendee: string,
        tokenURI: string,
        nonce: number
      ) {
        const domain = {
          name: EVENT_NAME,
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: await poap.getAddress(),
        };

        const types = {
          MintVoucher: [
            { name: "attendee", type: "address" },
            { name: "tokenURI", type: "string" },
            { name: "nonce", type: "uint256" },
          ],
        };

        const value = { attendee, tokenURI, nonce };
        return signer.signTypedData(domain, types, value);
      }

      it("should mint with valid host voucher", async function () {
        const signature = await signVoucher(host, attendee1.address, TOKEN_URI, 1);

        await expect(poap.mintWithVoucher(attendee1.address, TOKEN_URI, 1, signature))
          .to.emit(poap, "POAPMinted")
          .withArgs(attendee1.address, 1, TOKEN_URI);

        expect(await poap.ownerOf(1)).to.equal(attendee1.address);
        expect(await poap.hasMinted(attendee1.address)).to.be.true;
      });

      it("should allow anyone to submit a valid voucher", async function () {
        const signature = await signVoucher(host, attendee1.address, TOKEN_URI, 1);

        // attendee2 submits the voucher on behalf of attendee1
        await poap.connect(attendee2).mintWithVoucher(attendee1.address, TOKEN_URI, 1, signature);
        expect(await poap.ownerOf(1)).to.equal(attendee1.address);
      });

      it("should reject voucher signed by non-host", async function () {
        const signature = await signVoucher(attendee2, attendee1.address, TOKEN_URI, 1);

        await expect(
          poap.mintWithVoucher(attendee1.address, TOKEN_URI, 1, signature)
        ).to.be.revertedWithCustomError(poap, "InvalidSignature");
      });

      it("should reject duplicate nonce", async function () {
        const sig1 = await signVoucher(host, attendee1.address, TOKEN_URI, 1);
        await poap.mintWithVoucher(attendee1.address, TOKEN_URI, 1, sig1);

        const sig2 = await signVoucher(host, attendee2.address, TOKEN_URI, 1);
        await expect(
          poap.mintWithVoucher(attendee2.address, TOKEN_URI, 1, sig2)
        ).to.be.revertedWithCustomError(poap, "NonceAlreadyUsed");
      });

      it("should reject voucher for already-minted attendee", async function () {
        const sig1 = await signVoucher(host, attendee1.address, TOKEN_URI, 1);
        await poap.mintWithVoucher(attendee1.address, TOKEN_URI, 1, sig1);

        const sig2 = await signVoucher(host, attendee1.address, TOKEN_URI, 2);
        await expect(
          poap.mintWithVoucher(attendee1.address, TOKEN_URI, 2, sig2)
        ).to.be.revertedWithCustomError(poap, "AlreadyMinted");
      });
    });

    // ──── Soulbound ────

    describe("Soulbound", function () {
      it("should block transfers", async function () {
        await poap.connect(host).hostMint(attendee1.address, TOKEN_URI);

        await expect(
          poap.connect(attendee1).transferFrom(attendee1.address, attendee2.address, 1)
        ).to.be.revertedWithCustomError(poap, "SoulboundTransfer");
      });

      it("should block safeTransferFrom", async function () {
        await poap.connect(host).hostMint(attendee1.address, TOKEN_URI);

        await expect(
          poap
            .connect(attendee1)
            ["safeTransferFrom(address,address,uint256)"](
              attendee1.address,
              attendee2.address,
              1
            )
        ).to.be.revertedWithCustomError(poap, "SoulboundTransfer");
      });
    });

    // ──── Multiple Mints ────

    describe("Multiple attendees", function () {
      it("should mint unique tokens for different attendees", async function () {
        await poap.connect(host).hostMint(attendee1.address, "ipfs://hash1");
        await poap.connect(host).hostMint(attendee2.address, "ipfs://hash2");

        expect(await poap.ownerOf(1)).to.equal(attendee1.address);
        expect(await poap.ownerOf(2)).to.equal(attendee2.address);
        expect(await poap.tokenURI(1)).to.equal("ipfs://hash1");
        expect(await poap.tokenURI(2)).to.equal("ipfs://hash2");
        expect(await poap.totalSupply()).to.equal(2);
      });
    });
  });
});
