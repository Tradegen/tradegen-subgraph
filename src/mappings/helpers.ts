/* eslint-disable prefer-const */
import {
  Address,
  BigDecimal,
  BigInt,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";
import { Pool as PoolContract} from "../../generated/templates/Pool/Pool";
import { NFTPool as NFTPoolContract} from "../../generated/templates/NFTPool/NFTPool";
import {
  PoolPosition,
  PoolPositionSnapshot,
  NFTPoolPosition,
  NFTPoolPositionSnapshot,
  AssetPosition,
  Pool,
  NFTPool,
  User,
} from "../../generated/schema";
import { PoolFactory } from "../../generated/PoolFactory/PoolFactory";
import { NFTPoolFactory } from "../../generated/NFTPoolFactory/NFTPoolFactory";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const POOL_FACTORY_ADDRESS = "0xC71Ff58Efa2bffaE0f120BbfD7C64893aA20bDE0";
export const NFT_POOL_FACTORY_ADDRESS = "0x2dB13ac7A21F42bcAaFC71C1f1F8c647AEBC9750";

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let ZERO_BD = BigDecimal.fromString("0");
export let ONE_BD = BigDecimal.fromString("1");
export let BI_18 = BigInt.fromI32(18);

export let poolFactoryContract = PoolFactory.bind(
  Address.fromString(POOL_FACTORY_ADDRESS)
);

export let NFTPoolFactoryContract = NFTPoolFactory.bind(
  Address.fromString(NFT_POOL_FACTORY_ADDRESS)
);

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function bigDecimalExp18(): BigDecimal {
  return BigDecimal.fromString("1000000000000000000");
}

export function convertEthToDecimal(eth: BigInt): BigDecimal {
  return eth.toBigDecimal().div(exponentToBigDecimal(new BigInt(18)));
}

export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function equalToZero(value: BigDecimal): boolean {
  const formattedVal = parseFloat(value.toString());
  const zero = parseFloat(ZERO_BD.toString());
  if (zero == formattedVal) {
    return true;
  }
  return false;
}

export function isNullEthValue(value: string): boolean {
  return (
    value ==
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );
}

export function fetchPoolName(poolAddress: Address): string {
  let contract = PoolContract.bind(poolAddress);

  // try types string for name
  let nameValue = "unknown";
  let nameResult = contract.try_name();

  return nameResult.value ? nameResult.value : nameValue;
}

export function fetchPoolPerformanceFee(poolAddress: Address): BigInt {
  let contract = PoolContract.bind(poolAddress);

  let performanceFeeValue = new BigInt(0);
  let performanceFeeResult = contract.try__performanceFee();

  return performanceFeeResult.value ? performanceFeeResult.value : performanceFeeValue;
}

export function fetchPoolTokenPrice(poolAddress: Address): BigInt {
  let contract = PoolContract.bind(poolAddress);

  let tokenPriceValue = new BigInt(0);
  let tokenPriceResult = contract.try_tokenPrice();

  return tokenPriceResult.value ? tokenPriceResult.value : tokenPriceValue;
}

export function fetchPoolTotalSupply(poolAddress: Address): BigInt {
  let contract = PoolContract.bind(poolAddress);

  let totalSupplyValue = new BigInt(0);
  let totalSupplyResult = contract.try_totalSupply();

  return totalSupplyResult.value ? totalSupplyResult.value : totalSupplyValue;
}

export function fetchNFTPoolName(NFTPoolAddress: Address): string {
  let contract = NFTPoolContract.bind(NFTPoolAddress);

  // try types string for name
  let nameValue = "unknown";
  let nameResult = contract.try_name();

  return nameResult.value ? nameResult.value : nameValue;
}

export function fetchNFTPoolMaxSupply(NFTPoolAddress: Address): BigInt {
  let contract = NFTPoolContract.bind(NFTPoolAddress);

  let maxSupplyValue = new BigInt(0);
  let maxSupplyResult = contract.try_maxSupply();

  return maxSupplyResult.value ? maxSupplyResult.value : maxSupplyValue;
}

export function fetchNFTPoolSeedPrice(NFTPoolAddress: Address): BigInt {
  let contract = NFTPoolContract.bind(NFTPoolAddress);

  let seedPriceValue = new BigInt(0);
  let seedPriceResult = contract.try_seedPrice();

  return seedPriceResult.value ? seedPriceResult.value : seedPriceValue;
}

export function fetchNFTPoolTokenPrice(NFTPoolAddress: Address): BigInt {
  let contract = NFTPoolContract.bind(NFTPoolAddress);

  let tokenPriceValue = new BigInt(0);
  let tokenPriceResult = contract.try_tokenPrice();

  return tokenPriceResult.value ? tokenPriceResult.value : tokenPriceValue;
}

export function fetchNFTPoolTotalSupply(NFTPoolAddress: Address): BigInt {
  let contract = NFTPoolContract.bind(NFTPoolAddress);

  let totalSupplyValue = new BigInt(0);
  let totalSupplyResult = contract.try_totalSupply();

  return totalSupplyResult.value ? totalSupplyResult.value : totalSupplyValue;
}

export function fetchNFTPoolAvailableTokens(NFTPoolAddress: Address): BigInt[] {
  let contract = NFTPoolContract.bind(NFTPoolAddress);

  let availableTokensValue = [new BigInt(0), new BigInt(0), new BigInt(0), new BigInt(0)];
  let availableTokensResult = contract.try_getAvailableTokensPerClass();

  return availableTokensResult.value ? [availableTokensResult.value[0], availableTokensResult.value[1], availableTokensResult.value[2], availableTokensResult.value[3]] : availableTokensValue;
}

export function createUser(address: Address): void {
  let user = User.load(address.toHexString());
  if (user === null)
  {
    user = new User(address.toHexString());
    user.feesEarned = ZERO_BD;
    user.feesPaid = ZERO_BD;
    user.save();
  }
}

export function createPoolPosition(
  poolAddress: Address,
  userAddress: Address
): PoolPosition {
  let id = userAddress.toHexString().concat("-").concat(poolAddress.toHexString());
  let poolPosition = PoolPosition.load(id);
  if (poolPosition === null)
  {
    poolPosition.tokenBalance = ZERO_BI;
    poolPosition.averagePrice = ZERO_BI;
    poolPosition.pool = poolAddress.toHexString();
    poolPosition.user = userAddress.toHexString();
    poolPosition.save();
  }

  return poolPosition as PoolPosition;
}

export function createNFTPoolPosition(
  NFTPoolAddress: Address,
  userAddress: Address
): NFTPoolPosition {
  let id = userAddress.toHexString().concat("-").concat(NFTPoolAddress.toHexString());
  let poolPosition = NFTPoolPosition.load(id);
  if (poolPosition === null)
  {
    poolPosition.tokenBalance = ZERO_BI;
    poolPosition.averagePrice = ZERO_BI;
    poolPosition.NFTPool = NFTPoolAddress.toHexString();
    poolPosition.user = userAddress.toHexString();
    poolPosition.save();
  }

  return poolPosition as NFTPoolPosition;
}

export function createAssetPosition(
  investmentAddress: Address,
  tokenAddress: Address,
  investmentType: number
): AssetPosition {
  let id = investmentAddress.toHexString().concat("-").concat(tokenAddress.toHexString());
  let assetPosition = AssetPosition.load(id);
  if (assetPosition === null)
  {
    assetPosition.tokenBalance = ZERO_BD;
    assetPosition.tokenAddress = tokenAddress.toHexString();

    if (investmentType == 1)
    {
      assetPosition.pool = investmentAddress.toHexString();
    }

    if (investmentType == 2)
    {
      assetPosition.NFTPool = investmentAddress.toHexString();
    }

    assetPosition.save();
  }

  return assetPosition as AssetPosition;
}

export function createPoolPositionSnapshot(
  position: PoolPosition,
  event: ethereum.Event
): void {
  let timestamp = event.block.timestamp.toI32();
  let pool = Pool.load(position.pool);

  // create new snapshot
  let snapshot = new PoolPositionSnapshot(
    position.id.concat(timestamp.toString())
  );
  snapshot.poolPosition = position.id;
  snapshot.timestamp = timestamp;
  snapshot.block = event.block.number.toI32();
  snapshot.user = position.user;
  snapshot.pool = position.pool;
  snapshot.tokenPrice = pool.tokenPrice;
  snapshot.totalSupply = pool.totalSupply;
  snapshot.tokenBalance = position.tokenBalance;
  snapshot.save();
  position.save();
}

export function createNFTPoolPositionSnapshot(
  position: NFTPoolPosition,
  event: ethereum.Event
): void {
  let timestamp = event.block.timestamp.toI32();
  let pool = NFTPool.load(position.NFTPool);

  // create new snapshot
  let snapshot = new NFTPoolPositionSnapshot(
    position.id.concat(timestamp.toString())
  );
  snapshot.NFTPoolPosition = position.id;
  snapshot.timestamp = timestamp;
  snapshot.block = event.block.number.toI32();
  snapshot.user = position.user;
  snapshot.NFTPool = position.NFTPool;
  snapshot.tokenPrice = pool.tokenPrice;
  snapshot.totalSupply = pool.totalSupply;
  snapshot.tokenBalance = position.tokenBalance;
  snapshot.save();
  position.save();
}
