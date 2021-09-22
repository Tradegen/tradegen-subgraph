import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Pool,
  PoolDayData,
  NFTPool,
  NFTPoolDayData,
  TradegenDayData,
  Tradegen,
} from "../../generated/schema";
import { PoolHourData, NFTPoolHourData } from "../../generated/schema";
import { ADDRESS_RESOLVER_ADDRESS, ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "./helpers";

export function updateTradegenDayData(event: ethereum.Event): TradegenDayData {
  let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let tradegenDayData = TradegenDayData.load(dayID.toString());
  if (tradegenDayData === null)
  {
    tradegenDayData = new TradegenDayData(dayID.toString());
    tradegenDayData.date = dayStartTimestamp;
    tradegenDayData.dailyVolumeUSD = ZERO_BD;
    tradegenDayData.totalVolumeUSD = ZERO_BD;
    tradegenDayData.totalValueLockedUSD = ZERO_BD;
    tradegenDayData.txCount = ZERO_BI;
  }

  tradegenDayData.totalVolumeUSD = tradegen.totalVolumeUSD;
  tradegenDayData.totalValueLockedUSD = tradegen.totalValueLockedUSD;
  tradegenDayData.txCount = tradegen.txCount;
  tradegenDayData.save();

  return tradegenDayData as TradegenDayData;
}

export function updatePoolDayData(event: ethereum.Event): PoolDayData {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let dayPoolID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(dayID).toString());
  let pool = Pool.load(event.address.toHexString());
  let poolDayData = PoolDayData.load(dayPoolID);
  if (poolDayData === null) {
    poolDayData = new PoolDayData(dayPoolID);
    poolDayData.date = dayStartTimestamp;
    poolDayData.pool = event.address.toHexString();
    poolDayData.dailyVolumeUSD = ZERO_BD;
    poolDayData.dailyTxns = ZERO_BI;
  }

  poolDayData.totalSupply = pool.totalSupply;
  poolDayData.totalValueLockedUSD = pool.totalValueLockedUSD;
  poolDayData.priceUSD = pool.tokenPrice;
  poolDayData.dailyTxns = poolDayData.dailyTxns.plus(ONE_BI);
  poolDayData.save();

  return poolDayData as PoolDayData;
}

export function updatePoolHourData(event: ethereum.Event): PoolHourData {
  let timestamp = event.block.timestamp.toI32();
  let hourIndex = timestamp / 3600; // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600; // want the rounded effect
  let hourPoolID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(hourIndex).toString());
  let pool = Pool.load(event.address.toHexString());
  let poolHourData = PoolHourData.load(hourPoolID);
  if (poolHourData === null) {
    poolHourData = new PoolHourData(hourPoolID);
    poolHourData.hourStartUnix = hourStartUnix;
    poolHourData.pool = event.address.toHexString();
    poolHourData.hourlyVolumeUSD = ZERO_BD;
    poolHourData.hourlyTxns = ZERO_BI;

    // random line to make a redeploy happen
    poolHourData.totalSupply = ZERO_BI;
  }

  poolHourData.totalSupply = pool.totalSupply;
  poolHourData.totalValueLockedUSD = pool.totalValueLockedUSD;
  poolHourData.tokenPrice = pool.tokenPrice;

  poolHourData.hourlyTxns = poolHourData.hourlyTxns.plus(ONE_BI);
  poolHourData.save();

  return poolHourData as PoolHourData;
}

export function updateNFTPoolDayData(event: ethereum.Event): NFTPoolDayData {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let dayPoolID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(dayID).toString());
  let pool = NFTPool.load(event.address.toHexString());
  let poolDayData = NFTPoolDayData.load(dayPoolID);
  if (poolDayData === null) {
    poolDayData = new NFTPoolDayData(dayPoolID);
    poolDayData.date = dayStartTimestamp;
    poolDayData.NFTPool = event.address.toHexString();
    poolDayData.dailyVolumeUSD = ZERO_BD;
    poolDayData.dailyTxns = ZERO_BI;
  }

  poolDayData.totalSupply = pool.totalSupply;
  poolDayData.totalValueLockedUSD = pool.totalValueLockedUSD;
  poolDayData.priceUSD = pool.tokenPrice;
  poolDayData.dailyTxns = poolDayData.dailyTxns.plus(ONE_BI);
  poolDayData.save();

  return poolDayData as NFTPoolDayData;
}

export function updateNFTPoolHourData(event: ethereum.Event): NFTPoolHourData {
  let timestamp = event.block.timestamp.toI32();
  let hourIndex = timestamp / 3600; // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600; // want the rounded effect
  let hourPoolID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(hourIndex).toString());
  let pool = NFTPool.load(event.address.toHexString());
  let poolHourData = NFTPoolHourData.load(hourPoolID);
  if (poolHourData === null) {
    poolHourData = new NFTPoolHourData(hourPoolID);
    poolHourData.hourStartUnix = hourStartUnix;
    poolHourData.NFTPool = event.address.toHexString();
    poolHourData.hourlyVolumeUSD = ZERO_BD;
    poolHourData.hourlyTxns = ZERO_BI;

    // random line to make a redeploy happen
    poolHourData.totalSupply = ZERO_BI;
  }

  poolHourData.totalSupply = pool.totalSupply;
  poolHourData.totalValueLockedUSD = pool.totalValueLockedUSD;
  poolHourData.tokenPrice = pool.tokenPrice;

  poolHourData.hourlyTxns = poolHourData.hourlyTxns.plus(ONE_BI);
  poolHourData.save();

  return poolHourData as NFTPoolHourData;
}