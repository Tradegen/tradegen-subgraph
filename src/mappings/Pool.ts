import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  DepositPool as DepositPoolEvent,
  WithdrawPool as WithdrawPoolEvent,
  MintFeePool as MintFeePoolEvent,
  Pool,
  User,
  PoolTransaction,
  PoolPosition,
  Tradegen
} from "../../generated/schema";
import {
  Deposit,
  Withdraw,
  MintedManagerFee,
} from "../../generated/templates/Pool/Pool";
import {
  updatePoolDayData,
  updatePoolHourData,
  updateTradegenDayData,
} from "./dayUpdates";
import {
  fetchPoolTokenPrice,
  fetchPoolTotalSupply,
  ADDRESS_RESOLVER_ADDRESS,
  ONE_BI,
  ZERO_BD,
  ONE_BD
} from "./helpers";

export function handleDeposit(event: Deposit): void {
    let pool = Pool.load(event.address.toHexString()) as Pool;

    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
    
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(new BigDecimal(event.params.amount));
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(new BigDecimal(event.params.amount));
    pool.save();
    
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS) as Tradegen;
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(new BigDecimal(event.params.amount));
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.plus(new BigDecimal(event.params.amount));
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
    
    let transaction = PoolTransaction.load(event.transaction.hash.toHexString()) as PoolTransaction;
    if (transaction === null) {
      transaction = new PoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.pool = event.address.toHexString();
    }
    
    // update deposit event
    let deposit = new DepositPoolEvent(event.transaction.hash.toHexString().concat("-deposit")) as DepositPoolEvent;
    deposit.poolTransaction = transaction.id;
    deposit.timestamp = transaction.timestamp;
    deposit.userAddress = event.params.userAddress.toHexString();
    deposit.poolAddress = event.address.toHexString();
    deposit.amount = event.params.amount;
    deposit.save();
    
    // update the transaction
    transaction.deposit = deposit.id;
    transaction.save();
    
    // update day entities
    let poolDayData = updatePoolDayData(event);
    let poolHourData = updatePoolHourData(event);
    let tradegenDayData = updateTradegenDayData(event);
    
    // deposit specific updating
    tradegenDayData.dailyVolumeUSD = tradegenDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.amount));
    tradegenDayData.save();
  
    // deposit specific updating for pool
    poolDayData.dailyVolumeUSD = poolDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.amount));
    poolDayData.save();
  
    // update hourly pool data
    poolHourData.hourlyVolumeUSD = poolHourData.hourlyVolumeUSD.plus(new BigDecimal(event.params.amount));
    poolHourData.save();
    
    let poolPosition = PoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString())) as PoolPosition;
    if (poolPosition === null)
    {
        poolPosition = new PoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.pool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BD;
        poolPosition.averagePrice = ZERO_BD;
    }

    let investedAmount = (poolPosition.tokenBalance).times(poolPosition.averagePrice);
    investedAmount = investedAmount.div(BigDecimal.fromString("1e18"));//.div(new BigDecimal(new BigInt(1e18)));
    let tokensAdded = (tokenPrice == new BigInt(0)) ? ZERO_BD : (new BigDecimal(event.params.amount)).div(new BigDecimal(tokenPrice));
    let newAveragePrice = (investedAmount.plus(new BigDecimal(event.params.amount))).div(poolPosition.tokenBalance.plus(tokensAdded));
    
    poolPosition.averagePrice = newAveragePrice;
    poolPosition.tokenBalance = poolPosition.tokenBalance.plus(tokensAdded);
    poolPosition.save();

    // create the user
    let user = User.load(event.params.userAddress.toHexString()) as User;
    if (user === null)
    {
        user = new User(event.params.userAddress.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.save();
}

export function handleWithdraw(event: Withdraw): void {
    let pool = Pool.load(event.address.toHexString()) as Pool;

    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
  
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(new BigDecimal(event.params.valueWithdrawn));
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.minus(new BigDecimal(event.params.valueWithdrawn));
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS) as Tradegen;
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(new BigDecimal(event.params.valueWithdrawn));
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.minus(new BigDecimal(event.params.valueWithdrawn));
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = PoolTransaction.load(event.transaction.hash.toHexString()) as PoolTransaction;
    if (transaction === null) {
      transaction = new PoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.pool = event.address.toHexString();
    }

    // update withdraw event
    let withdraw = new WithdrawPoolEvent(event.transaction.hash.toHexString().concat("-withdraw")) as WithdrawPoolEvent;
    withdraw.poolTransaction = transaction.id;
    withdraw.timestamp = transaction.timestamp;
    withdraw.userAddress = event.params.userAddress.toHexString();
    withdraw.poolAddress = event.address.toHexString();
    withdraw.tokenAmount = event.params.numberOfPoolTokens;
    withdraw.USDAmount = event.params.valueWithdrawn;
    withdraw.save();
    
    // update the transaction
    transaction.withdraw = withdraw.id;
    transaction.save();
    
    // update day entities
    let poolDayData = updatePoolDayData(event);
    let poolHourData = updatePoolHourData(event);
    let tradegenDayData = updateTradegenDayData(event);
  
    // deposit specific updating
    tradegenDayData.dailyVolumeUSD = tradegenDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.valueWithdrawn));
    tradegenDayData.save();
  
    // deposit specific updating for pool
    poolDayData.dailyVolumeUSD = poolDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.valueWithdrawn));
    poolDayData.save();
  
    // update hourly pool data
    poolHourData.hourlyVolumeUSD = poolHourData.hourlyVolumeUSD.plus(new BigDecimal(event.params.valueWithdrawn));
    poolHourData.save();

    let poolPosition = PoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString())) as PoolPosition;
    if (poolPosition === null)
    {
        poolPosition = new PoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.pool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BD;
        poolPosition.averagePrice = ZERO_BD;
    }

    let investedAmount = (poolPosition.tokenBalance).times(poolPosition.averagePrice).div(BigDecimal.fromString("1e18"));
    let newAveragePrice = (new BigDecimal(event.params.numberOfPoolTokens) >= poolPosition.tokenBalance) ?
                            ZERO_BD :
                            (investedAmount.minus(new BigDecimal(event.params.valueWithdrawn))).div(poolPosition.tokenBalance.minus(new BigDecimal(event.params.numberOfPoolTokens)));

    poolPosition.averagePrice = newAveragePrice;
    poolPosition.tokenBalance = poolPosition.tokenBalance.minus(new BigDecimal(event.params.numberOfPoolTokens));
    poolPosition.save();
}

export function handleMintedManagerFee(event: MintedManagerFee): void {
    let pool = Pool.load(event.address.toHexString()) as Pool;

    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
    let feeInUSD = (new BigDecimal(event.params.amount)).times(new BigDecimal(tokenPrice)).div(BigDecimal.fromString("1e18"));
  
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(feeInUSD);
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(feeInUSD);
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS) as Tradegen;
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(feeInUSD);
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.plus(feeInUSD);
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = PoolTransaction.load(event.transaction.hash.toHexString()) as PoolTransaction;
    if (transaction === null) {
      transaction = new PoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.pool = event.address.toHexString();
    }

    // update mint event
    let mint = new MintFeePoolEvent(event.transaction.hash.toHexString().concat("-mintFee")) as MintFeePoolEvent;
    mint.poolTransaction = transaction.id;
    mint.timestamp = transaction.timestamp;
    mint.managerAddress = event.params.manager.toHexString();
    mint.poolAddress = event.address.toHexString();
    mint.feesMinted = event.params.amount;
    mint.save();
    
    // update the transaction
    transaction.mintFee = mint.id;
    transaction.save();
  
    // update day entities
    let poolDayData = updatePoolDayData(event);
    let poolHourData = updatePoolHourData(event);
    let tradegenDayData = updateTradegenDayData(event);
  
    // deposit specific updating
    tradegenDayData.dailyVolumeUSD = tradegenDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.amount));
    tradegenDayData.save();
  
    // deposit specific updating for pool
    poolDayData.dailyVolumeUSD = poolDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.amount));
    poolDayData.save();
  
    // update hourly pool data
    poolHourData.hourlyVolumeUSD = poolHourData.hourlyVolumeUSD.plus(new BigDecimal(event.params.amount));
    poolHourData.save();

    // create the user
    let user = User.load(event.params.manager.toHexString()) as User;
    if (user === null)
    {
        user = new User(event.params.manager.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.feesEarned = user.feesEarned.plus(new BigDecimal(event.params.amount));

    user.save
}