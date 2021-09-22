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
  ZERO_BD
} from "./helpers";

export function handleDeposit(event: Deposit): void {
    let pool = NFTPool.load(event.address.toHexString()) as NFTPool;

    let totalSupply = fetchNFTPoolTotalSupply(event.address);
    let tokenPrice = fetchNFTPoolTokenPrice(event.address);
  
    // update NFT pool data
    pool.tokenPrice = tokenPrice;
    pool.totalSupply = totalSupply;
    pool.tradeVolumeUSD = pool.tradeVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    pool.totalValueLockedUSD = pool.totalValueLockedUSD.plus(new BigDecimal(event.params.amountOfUSD));
    pool.save();
  
    // update global values
    let tradegen = Tradegen.load(ADDRESS_RESOLVER_ADDRESS) as Tradegen;
    tradegen.totalVolumeUSD = tradegen.totalVolumeUSD.plus(new BigDecimal(event.params.amountOfUSD));
    tradegen.totalValueLockedUSD = tradegen.totalValueLockedUSD.plus(new BigDecimal(event.params.amountOfUSD));
    tradegen.txCount = tradegen.txCount.plus(ONE_BI);
    tradegen.save();
  
    let transaction = NFTPoolTransaction.load(event.transaction.hash.toHexString()) as NFTPoolTransaction;
    if (transaction === null) {
      transaction = new NFTPoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.NFTPool = event.address.toHexString();
    }

    // update deposit event
    let deposit = new DepositNFTPoolEvent(event.transaction.hash.toHexString().concat("-deposit")) as DepositNFTPoolEvent;
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

    let poolPosition = NFTPoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString())) as NFTPoolPosition;
    if (poolPosition === null)
    {
        poolPosition = new NFTPoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.NFTPool = event.address.toHexString();
        poolPosition.tokenBalance = ZERO_BD;
        poolPosition.averagePrice = ZERO_BD;
    }

    let investedAmount = (poolPosition.tokenBalance).times(poolPosition.averagePrice).div(BigDecimal.fromString("1e18"));
    let newAveragePrice = (investedAmount.plus(new BigDecimal(event.params.amountOfUSD))).div(poolPosition.tokenBalance.plus(new BigDecimal(event.params.numberOfPoolTokens)));

    poolPosition.averagePrice = newAveragePrice;
    poolPosition.tokenBalance = poolPosition.tokenBalance.plus(new BigDecimal(event.params.numberOfPoolTokens));
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
    let pool = NFTPool.load(event.address.toHexString()) as NFTPool;

    let totalSupply = fetchNFTPoolTotalSupply(event.address);
    let tokenPrice = fetchNFTPoolTokenPrice(event.address);
  
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
  
    let transaction = NFTPoolTransaction.load(event.transaction.hash.toHexString()) as NFTPoolTransaction;
    if (transaction === null) {
      transaction = new NFTPoolTransaction(event.transaction.hash.toHexString());
      transaction.blockNumber = event.block.number;
      transaction.timestamp = event.block.timestamp;
      transaction.NFTPool = event.address.toHexString();
    }

    // update withdraw event
    let withdraw = new WithdrawNFTPoolEvent(event.transaction.hash.toHexString().concat("-withdraw")) as WithdrawNFTPoolEvent;
    withdraw.NFTPoolTransaction = transaction.id;
    withdraw.timestamp = transaction.timestamp;
    withdraw.userAddress = event.params.userAddress.toHexString();
    withdraw.NFTPoolAddress = event.address.toHexString();
    withdraw.tokenAmount = event.params.numberOfPoolTokens;
    withdraw.USDAmount = event.params.valueWithdrawn;
    withdraw.save();
    
    // update the transaction
    transaction.withdraw = withdraw.id;
    transaction.save();
  
    // update day entities
    let poolDayData = updateNFTPoolDayData(event);
    let poolHourData = updateNFTPoolHourData(event);
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

    let poolPosition = NFTPoolPosition.load(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString())) as NFTPoolPosition;
    if (poolPosition === null)
    {
        poolPosition = new NFTPoolPosition(event.address.toHexString().concat("-").concat(event.params.userAddress.toHexString()));
        poolPosition.user = event.params.userAddress.toHexString();
        poolPosition.NFTPool = event.address.toHexString();
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