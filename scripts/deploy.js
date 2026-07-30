import hre from "hardhat";

async function main() {
  const VoterRegistry = await hre.ethers.getContractFactory("VoterRegistry");
  const registry = await VoterRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("VoterRegistry deployed to:", registryAddress);

  const ElectionManager = await hre.ethers.getContractFactory("ElectionManager");
  const manager = await ElectionManager.deploy(registryAddress);
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();
  console.log("ElectionManager deployed to:", managerAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
