import { Uint256 } from 'starknet';

/**
 * Ekubo swap parameters
 */
export interface SwapParameters {
  amount: {
    mag: Uint256;
    sign: boolean; // Always positive for swaps
  }; // Amount to swap with magnitude and sign
  sqrt_ratio_limit: string; // Price limit for the swap (u128)
  is_token1: boolean; // Whether the input token is token1
  skip_ahead: number; // Skip ahead parameter (u32)
}

/**
 * Ekubo pool key structure
 */
export interface PoolKey {
  token0: string; // First token in the pool
  token1: string; // Second token in the pool
  fee: string; // Pool fee in basis points (u128)
  tick_spacing: number; // Tick spacing for the pool (u32)
  extension: string; // Pool extension parameter (felt252)
}

/**
 * Swap data structure for ekubo_manual_swap function
 */
export interface SwapData {
  params: SwapParameters;
  pool_key: PoolKey;
  caller: string;
}

/**
 * Fee type enum
 */
export enum FeeType {
  Fixed = 0,
  Percentage = 1,
}

/**
 * Contract information structure
 */
export interface ContractInfo {
  fees_collector: string;
  fibrous_exchange_address: string;
  avnu_exchange_address: string;
  oracle_address: string;
  owner: string;
  fee_type: FeeType;
  percentage_fee: number;
}

/**
 * Configuration for the AutoSwappr SDK
 */
export interface AutoSwapprConfig {
  contractAddress: string;
  rpcUrl: string;
  accountAddress: string;
  privateKey: string;
}

/**
 * Token information for supported tokens
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

/**
 * Pool configuration for different token pairs
 */
export interface PoolConfig {
  token0: string;
  token1: string;
  fee: string;
  tick_spacing: number;
  extension: string;
  sqrt_ratio_limit: string;
}

/**
 * Swap options for configuring the swap
 */
export interface SwapOptions {
  amount: string; // Amount in wei (with decimals)
  isToken1?: boolean; // Whether input token is token1 (defaults to false)
  skipAhead?: number; // Skip ahead parameter (defaults to 0)
  sqrtRatioLimit?: string; // Custom sqrt ratio limit
}

/**
 * Swap quote information
 */
export interface SwapQuote {
  inputAmount: string; // Amount being swapped (with decimals)
  outputAmount: string; // Expected output amount (with decimals)
  inputToken: string; // Input token address
  outputToken: string; // Output token address
  priceImpact: string; // Price impact percentage
  exchangeRate: string; // Exchange rate (output/input)
  poolFee: string; // Pool fee percentage
  estimatedGas: string; // Estimated gas cost
}

/**
 * Error types for the SDK
 */
export enum AutoSwapprError {
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  UNSUPPORTED_TOKEN = 'UNSUPPORTED_TOKEN',
  ZERO_AMOUNT = 'ZERO_AMOUNT',
  INVALID_POOL_CONFIG = 'INVALID_POOL_CONFIG',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SWAP_FAILED = 'SWAP_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  QUOTE_FAILED = 'QUOTE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Custom error class for AutoSwappr operations
 */
export class AutoSwapprSDKError extends Error {
  public readonly code: AutoSwapprError;
  public readonly originalError?: Error;
  public readonly retryable: boolean;

  constructor(
    code: AutoSwapprError,
    message: string,
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AutoSwapprSDKError';
    this.code = code;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}
