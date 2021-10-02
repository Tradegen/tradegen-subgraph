import { CreatedPool } from "../../generated/PoolFactory/PoolFactory";
import {
  log
} from "@graphprotocol/graph-ts";
import {
  Pool,
  Tradegen,
  PoolLookup,
  User,
  ManagedInvestment,
  PoolTransaction,
  CreatePool
} from "../../generated/schema";
import { Pool as PoolTemplate } from "../../generated/templates";
import {
  ADDRESS_RESOLVER_ADDRESS,
  fetchPoolName,
  fetchPoolPerformanceFee,
  fetchPoolTotalSupply,
  fetchPoolTokenPrice,
  ZERO_BD,
  ZERO_BI
} from "./helpers";

export function handleNewPool(event: CreatedPool): void {
  log.error("start of Pool Factory", []);
  // load Tradegen (create if first pool/NFTpool)
  let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
  if (tradegen === null)
  {
    tradegen = new Tradegen(ADDRESS_RESOLVER_ADDRESS);
    tradegen.poolCount = 0;
    tradegen.NFTPoolCount = 0;
    tradegen.totalVolumeUSD = ZERO_BD;
    tradegen.totalValueLockedUSD = ZERO_BD;
    tradegen.txCount = ZERO_BI;
  }
  
  log.error("PoolFactory: created Tradegen", [ADDRESS_RESOLVER_ADDRESS]);
  
  tradegen.poolCount = tradegen.poolCount + 1;
  tradegen.save();
  
  log.error("PoolFactory: saved Tradegen", []);
  
  // create the pool
  let pool = new Pool(event.params.poolAddress.toHexString());
  pool.name = fetchPoolName(event.params.poolAddress);
  pool.manager = event.params.managerAddress.toHexString();
  pool.performanceFee = fetchPoolPerformanceFee(event.params.poolAddress);
  pool.tokenPrice = fetchPoolTokenPrice(event.params.poolAddress);
  pool.totalSupply = fetchPoolTotalSupply(event.params.poolAddress);
  pool.tradeVolumeUSD = ZERO_BD;
  pool.feesCollected = ZERO_BD;
  pool.totalValueLockedUSD = ZERO_BD;

  pool.save();

  log.error("PoolFactory: created pool", [event.params.poolAddress.toHexString()]);
  
  let poolLookup = new PoolLookup(event.params.poolAddress.toHexString());
  poolLookup.poolAddress = pool.id;

  log.error("PoolFactory: created pool lookup", [event.params.poolAddress.toHexString()]);

  // save updated values
  poolLookup.save();

  log.error("PoolFactory: saved pool and pool lookup", [event.params.poolAddress.toHexString()]);

  // create the tracked contract based on the template
  PoolTemplate.create(event.params.poolAddress);

  log.error("PoolFactory: created pool template", [event.params.poolAddress.toHexString()]);

  // create the user
  let user = User.load(event.params.managerAddress.toHexString());
  if (user === null)
  {
    user = new User(event.params.managerAddress.toHexString());
    user.feesEarned = ZERO_BD;
  }

  log.error("PoolFactory: loaded user", [event.params.poolAddress.toHexString()]);

  user.save();

  log.error("PoolFactory: saved user", [event.params.poolAddress.toHexString()]);
  
  // create the managed investment
  let managedInvestmentID = event.params.managerAddress.toHexString().concat("-").concat(event.params.poolAddress.toHexString());
  let managedInvestment = ManagedInvestment.load(managedInvestmentID);
  if (managedInvestment === null)
  {
    managedInvestment = new ManagedInvestment(managedInvestmentID);
    managedInvestment.pool = pool.id;
    managedInvestment.manager = user.id;
  }

  log.error("PoolFactory: created managed investment", [event.params.poolAddress.toHexString()]);

  managedInvestment.save();

  log.error("PoolFactory: saved managed investment", [event.params.poolAddress.toHexString()]);
  
  let poolTransaction = PoolTransaction.load(event.transaction.hash.toHexString());
  if (poolTransaction === null)
  {
    let poolTransaction = new PoolTransaction(event.transaction.hash.toHexString());
    poolTransaction.blockNumber = event.block.number;
    poolTransaction.timestamp = event.block.timestamp;
    poolTransaction.pool = pool.id;
  }

  log.error("PoolFactory: created pool transaction", [event.params.poolAddress.toHexString()]);

  poolTransaction.save();

  log.error("PoolFactory: saved pool transaction", [event.params.poolAddress.toHexString()]);
  /*
  let createPoolTransaction = new CreatePool(event.transaction.hash.toHexString().concat("-create"));
  createPoolTransaction.poolTransaction = event.transaction.hash.toHexString();
  createPoolTransaction.timestamp = event.block.timestamp;
  createPoolTransaction.manager = event.params.managerAddress.toHexString();
  createPoolTransaction.poolAddress = event.params.poolAddress.toHexString();
  createPoolTransaction.poolIndex = event.params.poolIndex;

  log.error("PoolFactory: make CreatePoolTransaction", [event.params.poolAddress.toHexString()]);

  createPoolTransaction.save();

  log.error("PoolFactory: save CreatePoolTransaction", [event.params.poolAddress.toHexString()]);

  //poolTransaction.create = createPoolTransaction.id;
  //poolTransaction.save();

  log.error("PoolFactory: update PoolTransaction", [event.params.poolAddress.toHexString()]);*/
}