import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  DepositNFTPool as DepositNFTPoolEvent,
  WithdrawNFTPool as WithdrawNFTPoolEvent,
  NFTPool,
  User,
  NFTPoolTransaction,
  NFTPoolPosition,
  Tradegen
} from "../../generated/schema";
import {
  Deposit,
  Withdraw
} from "../../generated/templates/NFTPool/NFTPool";
import {
  updateNFTPoolDayData,
  updateNFTPoolHourData,
  updateTradegenDayData,
} from "./dayUpdates";
import {
  fetchNFTPoolTokenPrice,
  fetchNFTPoolTotalSupply,
  ADDRESS_RESOLVER_ADDRESS,
  ONE_BI,
  ZERO_BD,
  ZERO_BI
} from "./helpers";

export function handleDeposit(event: Deposit): void {
    let pool = NFTPool.load(event.address.toHexString());

    let totalSupply = fetchNFTPoolTotalSupply(event.address);
    let tokenPrice = fetchNFTPoolTokenPrice(event.address);

    // create the user
    let user = User.load(event.params.userAddress.toHexString());
    if (user === null)
    {
        user = new User(event.params.userAddress.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.save();
  
    // update NFT pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(new BigDecimal(event.params.amountOfUSD));
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.plus(new BigDecimal(event.params.amountOfUSD));
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = NFTPoolTransaction.load(event.transaction.hash.toHexString());
    if (transaction === null) {
      transaction = new NFTPoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.NFTPool = event.address.toHexString();
    }

    transaction.save();

    // update deposit event
    let deposit = new DepositNFTPoolEvent(event.transaction.hash.toHexString().concat("-deposit"));
    deposit.NFTPoolTransaction = transaction.id;
    deposit.timestamp = transaction.timestamp;
    deposit.userAddress = event.params.userAddress.toHexString();
    deposit.NFTPoolAddress = event.address.toHexString();
    deposit.USDAmount = event.params.amountOfUSD;
    deposit.tokenAmount = event.params.numberOfPoolTokens;
    deposit.save();
    
    // update the transaction
    transaction.deposit = deposit.id;
    transaction.save();
  
    // update day entities
    let poolDayData = updateNFTPoolDayData(event);
    let poolHourData = updateNFTPoolHourData(event);
    let tradegenDayData = updateTradegenDayData(event);
  
    // deposit specific updating
    tradegenDayData.dailyVolumeUSD = tradegenDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    tradegenDayData.save();
  
    // deposit specific updating for pool
    poolDayData.dailyVolumeUSD = poolDayData.dailyVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    poolDayData.save();
  
    // update hourly pool data
    poolHourData.hourlyVolumeUSD = poolHourData.hourlyVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    poolHourData.save();

    let poolPosition = NFTPoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
    if (poolPosition === null)
    {
        poolPosition = new NFTPoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.NFTPool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BI;
        poolPosition.averagePrice = ZERO_BD;
    }

    let investedAmount = (poolPosition.tokenBalance.toBigDecimal()).times(poolPosition.averagePrice).div(BigDecimal.fromString("1e18"));
    let newAveragePrice = (investedAmount.plus(new BigDecimal(event.params.amountOfUSD))).div(poolPosition.tokenBalance.toBigDecimal().plus(event.params.numberOfPoolTokens.toBigDecimal()));

    poolPosition.averagePrice = newAveragePrice;
    poolPosition.tokenBalance = poolPosition.tokenBalance.plus(event.params.numberOfPoolTokens);
    poolPosition.save();
}

export function handleWithdraw(event: Withdraw): void {
    let pool = NFTPool.load(event.address.toHexString());

    let totalSupply = fetchNFTPoolTotalSupply(event.address);
    let tokenPrice = fetchNFTPoolTokenPrice(event.address);

    // create the user
    let user = User.load(event.params.userAddress.toHexString());
    if (user === null)
    {
        user = new User(event.params.userAddress.toHexString());
        user.feesEarned = ZERO_BD;
    }

    user.save();

    let valueWithdrawn = (event.params.numberOfPoolTokens.toBigDecimal()).times(tokenPrice.toBigDecimal());
  
    // update pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(valueWithdrawn);
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.minus(valueWithdrawn);
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS);
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(valueWithdrawn);
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.minus(valueWithdrawn);
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = NFTPoolTransaction.load(event.transaction.hash.toHexString());
    if (transaction === null) {
      transaction = new NFTPoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.NFTPool = event.address.toHexString();
    }

    transaction.save();

    // update withdraw event
    let withdraw = new WithdrawNFTPoolEvent(event.transaction.hash.toHexString().concat("-withdraw"));
    withdraw.NFTPoolTransaction = transaction.id;
    withdraw.timestamp = transaction.timestamp;
    withdraw.userAddress = event.params.userAddress.toHexString();
    withdraw.NFTPoolAddress = event.address.toHexString();
    withdraw.tokenAmount = event.params.numberOfPoolTokens;
    withdraw.USDAmount = valueWithdrawn;
    withdraw.save();
    
    // update the transaction
    transaction.withdraw = withdraw.id;
    transaction.save();
  
    // update day entities
    let poolDayData = updateNFTPoolDayData(event);
    let poolHourData = updateNFTPoolHourData(event);
    let tradegenDayData = updateTradegenDayData(event);
  
    // deposit specific updating
    tradegenDayData.dailyVolumeUSD = tradegenDayData.dailyVolumeUSD.plus(valueWithdrawn);
    tradegenDayData.save();
  
    // deposit specific updating for pool
    poolDayData.dailyVolumeUSD = poolDayData.dailyVolumeUSD.plus(valueWithdrawn);
    poolDayData.save();
  
    // update hourly pool data
    poolHourData.hourlyVolumeUSD = poolHourData.hourlyVolumeUSD.plus(valueWithdrawn);
    poolHourData.save();

    let poolPosition = NFTPoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
    if (poolPosition === null)
    {
        poolPosition = new NFTPoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.NFTPool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BI;
        poolPosition.averagePrice = ZERO_BD;
    }

    let investedAmount = (poolPosition.tokenBalance.toBigDecimal()).times(poolPosition.averagePrice).div(BigDecimal.fromString("1e18"));
    let newAveragePrice = (new BigDecimal(event.params.valueWithdrawn) >= investedAmount || event.params.numberOfPoolTokens >= poolPosition.tokenBalance) ?
                            ZERO_BD :
                            (investedAmount.minus(new BigDecimal(event.params.valueWithdrawn))).div(poolPosition.tokenBalance.toBigDecimal().minus(event.params.numberOfPoolTokens.toBigDecimal()));

    poolPosition.averagePrice = newAveragePrice;
    poolPosition.tokenBalance = poolPosition.tokenBalance.minus(event.params.numberOfPoolTokens);
    poolPosition.save();
}