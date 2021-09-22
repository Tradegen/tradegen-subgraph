import { CreatedNFTPool } from "../../generated/NFTPoolFactory/NFTPoolFactory";
import {
  NFTPool,
  Tradegen,
  NFTPoolLookup,
} from "../../generated/schema";
import { NFTPool as NFTPoolTemplate } from "../../generated/templates";
import {
  ADDRESS_RESOLVER_ADDRESS,
  fetchNFTPoolName,
  fetchNFTPoolMaxSupply,
  fetchNFTPoolSeedPrice,
  fetchNFTPoolTotalSupply,
  fetchNFTPoolTokenPrice,
  fetchNFTPoolAvailableTokens,
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

  let availableTokens = fetchNFTPoolAvailableTokens(event.params.poolAddress);

  // create the NFT pool
  let pool = new NFTPool(event.params.poolAddress.toHexString()) as NFTPool;
  pool.name = fetchNFTPoolName(event.params.poolAddress);
  pool.manager = event.params.managerAddress.toHexString();
  pool.maxSupply = fetchNFTPoolMaxSupply(event.params.poolAddress);
  pool.seedPrice = fetchNFTPoolSeedPrice(event.params.poolAddress);
  pool.tokenPrice = fetchNFTPoolTokenPrice(event.params.poolAddress);
  pool.totalSupply = fetchNFTPoolTotalSupply(event.params.poolAddress);
  pool.availableC1 = availableTokens[0];
  pool.availableC2 = availableTokens[1];
  pool.availableC3 = availableTokens[2];
  pool.availableC4 = availableTokens[3];
  pool.tradeVolumeUSD = ZERO_BD;
  pool.feesCollected = ZERO_BI;
  pool.totalValueLockedUSD = ZERO_BD;

  let poolLookup = new NFTPoolLookup(event.params.poolAddress.toHexString());
  poolLookup.NFTPoolAddress = event.params.poolAddress.toHexString();

  // create the tracked contract based on the template
  NFTPoolTemplate.create(event.params.poolAddress);

  // save updated values
  pool.save();
  poolLookup.save();
}
