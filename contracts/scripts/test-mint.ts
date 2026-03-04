import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = signer.address;
  console.log("Signer:", address);

  // Deployed addresses
  const FACTORY_ADDRESS = "0x69738E4Bbf8691D1177d45c5701446683E4A2Bcb";

  const factory = await ethers.getContractAt("POAPFactory", FACTORY_ADDRESS);

  // 1. Create an event POAP
  console.log("\n1. Creating event POAP...");
  const eventId = `test-event-${Date.now()}`;
  const tx = await factory.createEventPOAP("Duma Launch Party", "DUMA", eventId);
  const receipt = await tx.wait();
  console.log("   Tx:", receipt!.hash);

  const cloneAddress = await factory.getEventPOAP(eventId);
  console.log("   EventPOAP clone:", cloneAddress);

  const poap = await ethers.getContractAt("EventPOAP", cloneAddress);
  console.log("   Name:", await poap.name());
  console.log("   Owner (host):", await poap.owner());

  // 2. Sign an EIP-712 voucher (host signs for themselves as attendee)
  console.log("\n2. Signing EIP-712 mint voucher...");
  const tokenURI = "ipfs://QmTestMetadata/1.json";
  const nonce = 1;

  const domain = {
    name: "Duma Launch Party",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: cloneAddress,
  };

  const types = {
    MintVoucher: [
      { name: "attendee", type: "address" },
      { name: "tokenURI", type: "string" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const voucher = { attendee: address, tokenURI, nonce };
  const signature = await signer.signTypedData(domain, types, voucher);
  console.log("   Signature:", signature.slice(0, 20) + "...");

  // 3. Mint with voucher (gasless for attendee — host submits tx)
  console.log("\n3. Minting with voucher (attendee pays 0 gas)...");
  const mintTx = await poap.mintWithVoucher(address, tokenURI, nonce, signature);
  const mintReceipt = await mintTx.wait();
  console.log("   Tx:", mintReceipt!.hash);
  console.log("   Gas used:", mintReceipt!.gasUsed.toString());

  // 4. Verify
  console.log("\n4. Verifying...");
  console.log("   Token owner:", await poap.ownerOf(1));
  console.log("   Token URI:", await poap.tokenURI(1));
  console.log("   Total supply:", (await poap.totalSupply()).toString());
  console.log("   Has minted:", await poap.hasMinted(address));

  // 5. Try transferring (should fail — soulbound)
  console.log("\n5. Testing soulbound (transfer should revert)...");
  try {
    await poap.transferFrom(address, "0x000000000000000000000000000000000000dEaD", 1);
    console.log("   ERROR: Transfer succeeded (should not happen!)");
  } catch (e: any) {
    console.log("   Correctly reverted: SoulboundTransfer");
  }

  console.log("\nDone! POAP minted successfully.");
  console.log("─".repeat(50));
  console.log("Factory:    ", FACTORY_ADDRESS);
  console.log("EventPOAP:  ", cloneAddress);
  console.log("Event ID:   ", eventId);
  console.log("Token ID:    1");
  console.log("Attendee:   ", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
