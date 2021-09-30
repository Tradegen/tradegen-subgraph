import {
  Address,
  BigDecimal,
  BigInt
} from "@graphprotocol/graph-ts";
import { Pool as PoolContract} from "../../generated/templates/Pool/Pool";
import { NFTPool as NFTPoolContract} from "../../generated/templates/NFTPool/NFTPool";
import {
  PoolPosition,
  NFTPoolPosition,
  User
} from "../../generated/schema";
import { PoolFactory } from "../../generated/PoolFactory/PoolFactory";
import { NFTPoolFactory } from "../../generated/NFTPoolFactory/NFTPoolFactory";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const POOL_FACTORY_ADDRESS = "0xC71Ff58Efa2bffaE0f120BbfD7C64893aA20bDE0";
export const NFT_POOL_FACTORY_ADDRESS = "0x35D49c882F65Ce27042601c678da7A6953A134e3";
export const ADDRESS_RESOLVER_ADDRESS = "0x32432FFE7E23885DF303eA41ECEe1e31aC8652a2";

export const cUSD = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

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

export function createUser(address: Address): void {
  let user = User.load(address.toHexString());
  if (user === null)
  {
    user = new User(address.toHexString());
    user.feesEarned = ZERO_BD;
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
    poolPosition.tokenBalance = ZERO_BD;
    poolPosition.averagePrice = ZERO_BD;
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
    poolPosition.tokenBalance = ZERO_BD;
    poolPosition.averagePrice = ZERO_BD;
    poolPosition.NFTPool = NFTPoolAddress.toHexString();
    poolPosition.user = userAddress.toHexString();
    poolPosition.save();
  }

  return poolPosition as NFTPoolPosition;
}
