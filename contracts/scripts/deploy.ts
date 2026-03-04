import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy the EventPOAP implementation (template for clones)
  const EventPOAP = await ethers.getContractFactory("EventPOAP");
  const implementation = await EventPOAP.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("EventPOAP implementation:", implAddress);

  // 2. Deploy the factory, pointing to the implementation
  const POAPFactory = await ethers.getContractFactory("POAPFactory");
  const factory = await POAPFactory.deploy(implAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("POAPFactory:", factoryAddress);

  console.log("\nDeployment complete!");
  console.log("─".repeat(50));
  console.log("Implementation:", implAddress);
  console.log("Factory:       ", factoryAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
