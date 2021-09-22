import { CreatedPool } from "../../generated/PoolFactory/PoolFactory";
import {
  Pool,
  Tradegen,
  PoolLookup,
} from "../../generated/schema";
import { Pool as PoolTemplate } from "../../generated/templates";
import {
  ADDRESS_RESOLVER_ADDRESS,
  fetchPoolName,
  fetchPoolPerformanceFee,
  fetchPoolTotalSupply,
  fetchPoolTokenPrice,
  ZERO_BD,
  ZERO_BI,
} from "./helpers";

export function handleNewPool(event: CreatedPool): void {
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

  tradegen.poolCount = tradegen.poolCount + 1;
  tradegen.save();

  // create the pool
  let pool = new Pool(event.params.poolAddress.toHexString()) as Pool;
  pool.name = fetchPoolName(event.params.poolAddress);
  pool.manager = event.params.managerAddress.toHexString();
  pool.performanceFee = fetchPoolPerformanceFee(event.params.poolAddress);
  pool.tokenPrice = fetchPoolTokenPrice(event.params.poolAddress);
  pool.totalSupply = fetchPoolTotalSupply(event.params.poolAddress);
  pool.tradeVolumeUSD = ZERO_BD;
  pool.feesCollected = ZERO_BI;
  pool.totalValueLockedUSD = ZERO_BD;

  let poolLookup = new PoolLookup(event.params.poolAddress.toHexString());
  poolLookup.poolAddress = event.params.poolAddress.toHexString();

  // create the tracked contract based on the template
  PoolTemplate.create(event.params.poolAddress);

  // save updated values
  pool.save();
  poolLookup.save();
}
