import { CreatedNFTPool } from "../types/NFTPoolFactory/NFTPoolFactory";
import {
  NFTPool,
  Tradegen,
  NFTPoolLookup,
  User,
  ManagedInvestment,
  NFTPoolTransaction,
  CreateNFTPool
} from "../types/schema";
import { NFTPool as NFTPoolTemplate } from "../types/templates";
import {
  ADDRESS_RESOLVER_ADDRESS,
  fetchNFTPoolName,
  fetchNFTPoolMaxSupply,
  fetchNFTPoolSeedPrice,
  fetchNFTPoolTotalSupply,
  fetchNFTPoolTokenPrice,
  ZERO_BD,
  ZERO_BI,
} from "./helpers";

export function handleNewNFTPool(event: CreatedNFTPool): void {
  // load Tradegen (create if first pool/NFTpool)
  let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
  if (tradegen === null) {
    tradegen = new Tradegen(ADDRESS_RESOLVER_ADDRESS);
    tradegen.poolCount = 0;
    tradegen.NFTPoolCount = 0;
    tradegen.totalVolumeUSD = ZERO_BD;
    tradegen.totalValueLockedUSD = ZERO_BD;
    tradegen.txCount = ZERO_BI;
  }

  tradegen.NFTPoolCount = tradegen.NFTPoolCount + 1;
  tradegen.save();
  
  // create the NFT pool
  let pool = new NFTPool(event.params.poolAddress.toHexString());
  pool.name = fetchNFTPoolName(event.params.poolAddress);
  pool.manager = event.params.managerAddress.toHexString();
  pool.maxSupply = fetchNFTPoolMaxSupply(event.params.poolAddress);
  pool.seedPrice = fetchNFTPoolSeedPrice(event.params.poolAddress);
  pool.tokenPrice = fetchNFTPoolTokenPrice(event.params.poolAddress);
  pool.totalSupply = fetchNFTPoolTotalSupply(event.params.poolAddress);
  pool.tradeVolumeUSD = ZERO_BD;
  pool.feesCollected = ZERO_BD;
  pool.totalValueLockedUSD = ZERO_BD;

  pool.save();
  
  let poolLookup = new NFTPoolLookup(event.params.poolAddress.toHexString());
  poolLookup.NFTPoolAddress = pool.id;

  poolLookup.save();
  
  // create the tracked contract based on the template
  NFTPoolTemplate.create(event.params.poolAddress);

  // create the user
  let user = User.load(event.params.managerAddress.toHexString());
  if (user === null)
  {
    user = new User(event.params.managerAddress.toHexString());
    user.feesEarned = ZERO_BD;
  }

  user.save();

  // create the managed investment
  let managedInvestmentID = event.params.managerAddress.toHexString().concat("-").concat(event.params.poolAddress.toHexString());
  let managedInvestment = new ManagedInvestment(managedInvestmentID);
  managedInvestment.NFTPool = event.params.poolAddress.toHexString();
  managedInvestment.manager = user.id;

  managedInvestment.save();
  
  let poolTransaction = new NFTPoolTransaction(event.transaction.hash.toHexString());
  poolTransaction.blockNumber = event.block.number;
  poolTransaction.timestamp = event.block.timestamp;
  poolTransaction.NFTPool = pool.id;

  poolTransaction.save();
  /*
  let createPoolTransaction = new CreateNFTPool(event.transaction.hash.toHexString().concat("-create"));
  createPoolTransaction.NFTPoolTransaction = event.transaction.hash.toHexString();
  createPoolTransaction.timestamp = event.block.timestamp;
  createPoolTransaction.manager = event.params.managerAddress.toHexString();
  createPoolTransaction.NFTPoolAddress = event.params.poolAddress.toHexString();
  createPoolTransaction.NFTPoolIndex = event.params.poolIndex;

  createPoolTransaction.save();

  //poolTransaction.create = createPoolTransaction.id;

  //poolTransaction.save();*/
}
