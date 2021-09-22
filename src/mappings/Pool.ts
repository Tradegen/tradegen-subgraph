import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts";
import {
  InvestPool as InvestPoolEvent,
  WithdrawPool as WithdrawPoolEvent,
  MintFeePool as MintFeePoolEvent,
  Trade,
  Swap as SwapCall,
  AddLiquidity as AddLiquidityCall,
  RemoveLiquidity as RemoveLiquidityCall,
  Stake as StakeCall,
  Unstake as UnstakeCall,
  Pool,
  User,
  PoolTransaction,
  AssetPosition,
  Tradegen,
} from "../../generated/schema";
import {
  Deposit,
  Withdraw,
  MintedManagerFee,
  Pool as PoolContract,
} from "../../generated/templates/Pool/Pool";
import {
  updatePoolDayData,
  updatePoolHourData,
  updateTradegenDayData,
} from "./dayUpdates";
import {
  fetchPoolTokenPrice,
  fetchPoolTotalSupply,
  ADDRESS_ZERO,
  createPoolPosition,
  createPoolPositionSnapshot,
  createUser,
  ADDRESS_RESOLVER_ADDRESS,
  ONE_BI,
  ZERO_BD,
} from "./helpers";
import {
  findUsdPerToken,
  getCeloPriceInUSD,
  getTrackedLiquidityUSD,
  getTrackedVolumeUSD,
} from "./pricing";

export function handleDeposit(event: Deposit): void {
    let pool = Pool.load(event.address.toHexString());

    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
  
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(new BigDecimal(event.params.amount));
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(new BigDecimal(event.params.amount));
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(new BigDecimal(event.params.amount));
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.plus(new BigDecimal(event.params.amount));
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = PoolTransaction.load(event.transaction.hash.toHexString());
    if (transaction === null) {
      transaction = new PoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.pool = event.address.toHexString();
      transaction.mints = [];
      transaction.swaps = [];
      transaction.burns = [];
    }
    let swaps = transaction.swaps;
    let swap = new SwapEvent(
      event.transaction.hash
        .toHexString()
        .concat("-")
        .concat(BigInt.fromI32(swaps.length).toString())
    );
  
    // update swap event
    swap.transaction = transaction.id;
    swap.pair = pair.id;
    swap.timestamp = transaction.timestamp;
    swap.transaction = transaction.id;
    swap.sender = event.params.sender;
    swap.amount0In = amount0In;
    swap.amount1In = amount1In;
    swap.amount0Out = amount0Out;
    swap.amount1Out = amount1Out;
    swap.to = event.params.to;
    swap.from = event.transaction.from;
    swap.logIndex = event.logIndex;
    // use the tracked amount if we have it
    swap.amountUSD =
      trackedAmountUSD === ZERO_BD ? derivedAmountCUSD : trackedAmountUSD;
    swap.save();
  
    // update the transaction
  
    // TODO: Consider using .concat() for handling array updates to protect
    // against unintended side effects for other code paths.
    swaps.push(swap.id);
    transaction.swaps = swaps;
    transaction.save();
  
    // update day entities
    let pairDayData = updatePairDayData(event);
    let pairHourData = updatePairHourData(event);
    let ubeswapDayData = updateUbeswapDayData(event);
    let token0DayData = updateTokenDayData(token0 as Token, event);
    let token1DayData = updateTokenDayData(token1 as Token, event);
  
    // swap specific updating
    ubeswapDayData.dailyVolumeUSD = ubeswapDayData.dailyVolumeUSD.plus(
      trackedAmountUSD
    );
    ubeswapDayData.dailyVolumeCELO = ubeswapDayData.dailyVolumeCELO.plus(
      trackedAmountCELO
    );
    ubeswapDayData.dailyVolumeUntracked = ubeswapDayData.dailyVolumeUntracked.plus(
      derivedAmountCUSD
    );
    ubeswapDayData.save();
  
    // swap specific updating for pair
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(
      amount0Total
    );
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(
      amount1Total
    );
    pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(
      trackedAmountUSD
    );
    pairDayData.save();
  
    // update hourly pair data
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(
      amount0Total
    );
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(
      amount1Total
    );
    pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(
      trackedAmountUSD
    );
    pairHourData.save();
  
    // swap specific updating for token0
    token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(
      amount0Total
    );
    token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(
      amount0Total.times(token1.derivedCUSD as BigDecimal)
    );
    token0DayData.dailyVolumeCELO = token0DayData.dailyVolumeCELO.plus(
      amount0Total.times(token0.derivedCUSD as BigDecimal).times(bundle.celoPrice)
    );
    token0DayData.save();
  
    // swap specific updating
    token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(
      amount1Total
    );
    token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
      amount1Total.times(token1.derivedCUSD as BigDecimal)
    );
    token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
      amount1Total.times(token1.derivedCUSD as BigDecimal).times(bundle.celoPrice)
    );
    token1DayData.save();
  }