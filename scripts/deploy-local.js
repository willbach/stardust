// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const fs = require('fs');
const path = require('path');
const {ethers} = require("hardhat");
const {singletons, constants} = require("@openzeppelin/test-helpers");

const
    PointGalaxyZero  = 0x0,
    PointStarZero    = 0x00000100, // 256, first star of galaxy zero
    PointStarOne     = 0x00000200, // 512, second star of galaxy zero
    PointStarTwo     = 0x00000300, // 768, third star of galaxy zero
    PointStarThree     = 0x00000400, // 1024, fourth star of galaxy zero
    PointPlanetZero  = 0x00010100; // 65792, first planet of first star of galaxy zero

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled

  const [registryFunder, creator, operator] = await ethers.getSigners();
  console.log(`
FUNDER: ${registryFunder.address}
CREATOR: ${creator.address}
OPERATOR: ${operator.address}
  `);

  // initialize Azimuth and Ecliptic for testing
  const Polls = await ethers.getContractFactory("PollsWrapper", creator);
  const Claims = await ethers.getContractFactory("ClaimsWrapper", creator);
  const Azimuth = await ethers.getContractFactory("AzimuthWrapper", creator);
  const Ecliptic = await ethers.getContractFactory("EclipticWrapper", creator);
  const azimuth = await Azimuth.deploy();
  const polls = await Polls.deploy(432000, 432000);
  const claims = await Claims.deploy(azimuth.address);
  const ecliptic = await Ecliptic.deploy(constants.ZERO_ADDRESS, azimuth.address, polls.address, claims.address);
  await azimuth.transferOwnership(ecliptic.address);
  await polls.transferOwnership(ecliptic.address);

  // now deploy our contracts
  const Treasury = await ethers.getContractFactory("Treasury", creator);
  const StarToken = await ethers.getContractFactory("StarToken", creator);
  await singletons.ERC1820Registry(creator.address);
  const treasury = await Treasury.deploy(azimuth.address);
  const tokenAddress = await treasury.startoken();
  const token = StarToken.attach(tokenAddress);
  const oneStar = await treasury.oneStar();

  // register some points for testing
  await ecliptic.createGalaxy(PointGalaxyZero, creator.address);

  await ecliptic.configureKeys(
    PointGalaxyZero,
    // these need to be bytes32
    web3.utils.padLeft(web3.utils.numberToHex(1), 64),
    web3.utils.padLeft(web3.utils.numberToHex(2), 64),
    1,
    false
  );

  await ecliptic.spawn(PointStarZero, creator.address);
  await ecliptic.spawn(PointStarOne, creator.address);
  await ecliptic.spawn(PointStarTwo, creator.address);
  await ecliptic.spawn(PointStarThree, creator.address);

  await ecliptic.configureKeys(
    PointStarZero,
    // these need to be bytes32
    web3.utils.padLeft(web3.utils.numberToHex(1), 64),
    web3.utils.padLeft(web3.utils.numberToHex(2), 64),
    1,
    false
  );

  await ecliptic.configureKeys(
    PointStarOne,
    // these need to be bytes32
    web3.utils.padLeft(web3.utils.numberToHex(1), 64),
    web3.utils.padLeft(web3.utils.numberToHex(2), 64),
    1,
    false
  );
  
  await ecliptic.spawn(0x00010100, creator.address);

  // log the contract addresses for dev purposes
  console.log(`
azimuth: ${azimuth.address}
polls: ${polls.address}
claims: ${claims.address}
ecliptic: ${ecliptic.address}
treasury: ${treasury.address}
    `)

    // write the contract address for use by the frontend
    fs.writeFileSync(path.join(__dirname, '../../starketplace/.env'),
    `
REACT_APP_AZIMUTH_ADDRESS=${azimuth.address}
REACT_APP_POLLS_ADDRESS=${polls.address}
REACT_APP_CLAIMS_ADDRESS=${claims.address}
REACT_APP_ECLIPTIC_ADDRESS=${ecliptic.address}
REACT_APP_TREASURY_ADDRESS=${treasury.address}
    `)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
