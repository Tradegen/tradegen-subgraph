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
} from "../types/schema";
import {
  Deposit,
  Withdraw,
  MintedManagerFee,
  ExecutedTransaction
} from "../types/templates/Pool/Pool";
import {
  updatePoolDayData,
  updatePoolHourData,
  updateTradegenDayData,
} from "./dayUpdates";
import {
  fetchPoolTokenPrice,
  fetchPoolTotalSupply,
  fetchPoolPositionAddresses,
  fetchPoolPositionBalances,
  ADDRESS_RESOLVER_ADDRESS,
  ONE_BI,
  ZERO_BD,
  ZERO_BI
} from "./helpers";

export function handleDeposit(event: Deposit): void {
    let pool = Pool.load(event.address.toHexString());
    
    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
    let positionAddresses = fetchPoolPositionAddresses(event.address);
    let positionBalances = fetchPoolPositionBalances(event.address);

    tokenPrice = (tokenPrice == ZERO_BI) ? BigInt.fromString("1000000000000000000") : tokenPrice;

    // create the user
    let user = User.load(event.params.userAddress.toHexString());
    if (user === null)
    {
        user = new User(event.params.userAddress.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.save();
    
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(new BigDecimal(event.params.amount));
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(new BigDecimal(event.params.amount));
    pool.positionAddresses = (positionAddresses) ? positionAddresses : pool.positionAddresses;
    pool.positionBalances = (positionBalances) ? positionBalances : pool.positionBalances;
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
    }

    transaction.save();
    
    // update deposit event
    let deposit = new DepositPoolEvent(event.transaction.hash.toHexString().concat("-deposit"));
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
    
    let poolPosition = PoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
    if (poolPosition === null)
    {
        poolPosition = new PoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.pool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BI;
        poolPosition.USDValue = ZERO_BI
    }

    let tokensAdded: BigInt = (tokenPrice == ZERO_BI) ? ZERO_BI : (event.params.amount).times(BigInt.fromString("1000000000000000000")).div(tokenPrice);
    poolPosition.tokenBalance = poolPosition.tokenBalance.plus(tokensAdded);
    poolPosition.USDValue = poolPosition.USDValue.plus(event.params.amount);
    poolPosition.save();
}

export function handleWithdraw(event: Withdraw): void {
    let pool = Pool.load(event.address.toHexString());
    
    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
    let positionAddresses = fetchPoolPositionAddresses(event.address);
    let positionBalances = fetchPoolPositionBalances(event.address);

    tokenPrice = (tokenPrice == ZERO_BI) ? BigInt.fromString("1000000000000000000") : tokenPrice;

    // create the user
    let user = User.load(event.params.userAddress.toHexString());
    if (user === null)
    {
        user = new User(event.params.userAddress.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.save();

    let valueWithdrawn: BigInt = (event.params.numberOfPoolTokens).times(tokenPrice).div(BigInt.fromString("1000000000000000000"));
  
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(valueWithdrawn.toBigDecimal());
    pool.totalValueLockedUSD = (valueWithdrawn.toBigDecimal() >= pool.totalValueLockedUSD) ? ZERO_BD : pool.totalValueLockedUSD.minus(valueWithdrawn.toBigDecimal());
    pool.positionAddresses = (positionAddresses) ? positionAddresses : pool.positionAddresses;
    pool.positionBalances = (positionBalances) ? positionBalances : pool.positionBalances;
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(valueWithdrawn.toBigDecimal());
    tradegen.totalValueLockedUSD = (valueWithdrawn.toBigDecimal() >= tradegen.totalValueLockedUSD) ? ZERO_BD : tradegen.totalValueLockedUSD.minus(valueWithdrawn.toBigDecimal());
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = PoolTransaction.load(event.transaction.hash.toHexString());
    if (transaction === null) {
      transaction = new PoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.pool = event.address.toHexString();
    }

    transaction.save();

    // update withdraw event
    let withdraw = new WithdrawPoolEvent(event.transaction.hash.toHexString().concat("-withdraw"));
    withdraw.poolTransaction = transaction.id;
    withdraw.timestamp = transaction.timestamp;
    withdraw.userAddress = event.params.userAddress.toHexString();
    withdraw.poolAddress = event.address.toHexString();
    withdraw.tokenAmount = event.params.numberOfPoolTokens;
    withdraw.USDAmount = valueWithdrawn.toBigDecimal();
    withdraw.save();
    
    // update the transaction
    transaction.withdraw = withdraw.id;
    transaction.save();
    
    // update day entities
    let poolDayData = updatePoolDayData(event);
    let poolHourData = updatePoolHourData(event);
    let tradegenDayData = updateTradegenDayData(event);
  
    // deposit specific updating
    tradegenDayData.dailyVolumeUSD = tradegenDayData.dailyVolumeUSD.plus(valueWithdrawn.toBigDecimal());
    tradegenDayData.save();
  
    // deposit specific updating for pool
    poolDayData.dailyVolumeUSD = poolDayData.dailyVolumeUSD.plus(valueWithdrawn.toBigDecimal());
    poolDayData.save();
  
    // update hourly pool data
    poolHourData.hourlyVolumeUSD = poolHourData.hourlyVolumeUSD.plus(valueWithdrawn.toBigDecimal());
    poolHourData.save();

    let poolPosition = PoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
    if (poolPosition === null)
    {
        poolPosition = new PoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.pool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BI;
        poolPosition.USDValue = ZERO_BI;
    }

    poolPosition.USDValue = (valueWithdrawn >= poolPosition.USDValue) ? ZERO_BI : poolPosition.USDValue.minus(valueWithdrawn);
    poolPosition.tokenBalance = (event.params.numberOfPoolTokens >= poolPosition.tokenBalance) ?
                                  ZERO_BI : poolPosition.tokenBalance.minus(event.params.numberOfPoolTokens);
    poolPosition.save();
}

export function handleMintedManagerFee(event: MintedManagerFee): void {
    let pool = Pool.load(event.address.toHexString());
    
    let totalSupply = fetchPoolTotalSupply(event.address);
    let tokenPrice = fetchPoolTokenPrice(event.address);
    let feeInUSD: BigDecimal = (event.params.amount.toBigDecimal()).times(new BigDecimal(tokenPrice)).div(BigDecimal.fromString("1e18"));

    tokenPrice = (tokenPrice == ZERO_BI) ? BigInt.fromString("1000000000000000000") : tokenPrice;

    // create the user
    let user = User.load(event.params.manager.toHexString());
    if (user === null)
    {
        user = new User(event.params.manager.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.feesEarned = user.feesEarned.plus(feeInUSD);

    user.save();
  
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(feeInUSD);
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(feeInUSD);
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(feeInUSD);
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.plus(feeInUSD);
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = PoolTransaction.load(event.transaction.hash.toHexString());
    if (transaction === null) {
      transaction = new PoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.pool = event.address.toHexString();
    }

    transaction.save();

    // update mint event
    let mint = new MintFeePoolEvent(event.transaction.hash.toHexString().concat("-mintFee"));
    mint.poolTransaction = transaction.id;
    mint.timestamp = transaction.timestamp;
    mint.managerAddress = event.params.manager.toHexString();
    mint.poolAddress = event.address.toHexString();
    mint.feesMinted = event.params.amount;
    mint.tokenPrice = tokenPrice;
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
}

export function handleExecutedTransaction(event: ExecutedTransaction): void {
  let pool = Pool.load(event.address.toHexString());
  
  let positionAddresses = fetchPoolPositionAddresses(event.address);
  let positionBalances = fetchPoolPositionBalances(event.address);

  // update pool data
  pool.positionAddresses = (positionAddresses) ? positionAddresses : pool.positionAddresses;
  pool.positionBalances = (positionBalances) ? positionBalances : pool.positionBalances;
  pool.save();
}