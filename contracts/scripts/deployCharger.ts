import "dotenv/config";
import hre from "hardhat";

async function main() {
  const deployerPk = process.env.DEPLOYER_PRIVATE_KEY;
  const usdtAddress = process.env.USDT_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  const ownerAddress = process.env.OWNER_ADDRESS;
  const maxSingleCharge = process.env.MAX_SINGLE_CHARGE;

  const missing: string[] = [];
  if (!deployerPk) missing.push("DEPLOYER_PRIVATE_KEY");
  if (!usdtAddress) missing.push("USDT_ADDRESS");
  if (!treasuryAddress) missing.push("TREASURY_ADDRESS");
  if (!ownerAddress) missing.push("OWNER_ADDRESS");
  if (!maxSingleCharge) missing.push("MAX_SINGLE_CHARGE");
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const Charger = await hre.ethers.getContractFactory("Charger");
  const charger = await Charger.deploy(
    usdtAddress,
    treasuryAddress,
    BigInt(maxSingleCharge),
    ownerAddress
  );
  await charger.waitForDeployment();
  const address = await charger.getAddress();

  console.log("CHARGER_CONTRACT_ADDRESS=" + address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
