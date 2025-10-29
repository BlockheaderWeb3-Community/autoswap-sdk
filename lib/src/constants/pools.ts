/**
 * Token addresses for common tokens
 */
export const TOKEN_ADDRESSES = {
  STRK: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  ETH: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  USDC: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
  USDT: '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
  WBTC: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
};

/**
 * Token information for supported tokens
 */
export const TOKEN_INFO = {
  [TOKEN_ADDRESSES.STRK]: {
    address: TOKEN_ADDRESSES.STRK,
    symbol: 'STRK',
    decimals: 18,
    name: 'Starknet Token',
  },
  [TOKEN_ADDRESSES.ETH]: {
    address: TOKEN_ADDRESSES.ETH,
    symbol: 'ETH',
    decimals: 18,
    name: 'Ether',
  },
  [TOKEN_ADDRESSES.USDC]: {
    address: TOKEN_ADDRESSES.USDC,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  [TOKEN_ADDRESSES.USDT]: {
    address: TOKEN_ADDRESSES.USDT,
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
  },
  [TOKEN_ADDRESSES.WBTC]: {
    address: TOKEN_ADDRESSES.WBTC,
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped BTC',
  },
};

/**
 * Get token info by address
 * @param address Token address
 * @returns Token info or null if not found
 */
export function getTokenInfo(address: string) {
  return TOKEN_INFO[address] || null;
}

export const AERODROME_V3_POOL_ADDRESS = "0x0206b696a410277ef692024c2b64ccf4eac78589";
export const AERODROME_V3_ROUTER = "0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5";
export const AERODROME_V3_QUOTER = "0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0";
export const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
export const CNGN_ADDRESS = "0x46c85152bfe9f96829aa94755d9f915f9b10ef5f";
export const USDC_DECIMALS = 6;
export const CNGN_DECIMALS = 6;
export const SWAP_DEADLINE_S = 1800;