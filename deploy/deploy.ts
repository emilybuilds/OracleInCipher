import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedOraclePrediction = await deploy("OraclePrediction", {
    from: deployer,
    log: true,
  });

  console.log(`OraclePrediction contract: `, deployedOraclePrediction.address);
};
export default func;
func.id = "deploy_oraclePrediction"; // id required to prevent reexecution
func.tags = ["OraclePrediction"];
