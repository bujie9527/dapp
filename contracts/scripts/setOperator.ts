import "dotenv/config";
import hre from "hardhat";

async function main() {
  const chargerAddress = process.env.CHARGER_CONTRACT_ADDRESS;
  const operatorAddress = process.env.OPERATOR_ADDRESS;

  const missing: string[] = [];
  if (!chargerAddress) missing.push("CHARGER_CONTRACT_ADDRESS");
  if (!operatorAddress) missing.push("OPERATOR_ADDRESS");
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  const [signer] = await hre.ethers.getSigners();
  const Charger = await hre.ethers.getContractFactory("Charger");
  const charger = Charger.attach(chargerAddress).connect(signer);
  const tx = await charger.setOperator(operatorAddress, true);
  const receipt = await tx.wait();
  const txHash = receipt!.hash;

  console.log("txHash=" + txHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
