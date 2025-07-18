import {
  Account,
  cairo,
  CallData,
  Contract,
  RpcProvider,
  SIMULATION_FLAG,
  uint256
} from "starknet";
import {
  AutoSwapprConfig,
  SwapData,
  SwapOptions,
  SwapResult,
  ContractInfo,
  TokenInfo,
  PoolConfig,
  AutoSwapprError
} from "./types";
import { AUTOSWAPPR_ABI, ERC20_ABI } from "./contracts/autoswappr-abi";
import {
  getPoolConfig,
  getTokenInfo,
  TOKEN_ADDRESSES
} from "./constants/pools";

/**
 * AutoSwappr SDK for interacting with the ekubo_manual_swap function
 */
export class AutoSwappr {
  private provider: RpcProvider;
  private account: Account;
  private autoswapprContract: Contract;
  private config: AutoSwapprConfig;

  constructor(config: AutoSwapprConfig) {
    this.config = config;
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
    this.account = new Account(
      this.provider,
      config.accountAddress,
      config.privateKey
    );

    this.autoswapprContract = new Contract(
      AUTOSWAPPR_ABI,
      config.contractAddress,
      this.account
    );
  }

  /**
   * Get contract information
   * @returns Contract information including addresses and fee configuration
   */
  async getContractInfo(): Promise<ContractInfo> {
    try {
      const result = await this.autoswapprContract.contract_parameters();
      return {
        fees_collector: result.fees_collector,
        fibrous_exchange_address: result.fibrous_exchange_address,
        avnu_exchange_address: result.avnu_exchange_address,
        oracle_address: result.oracle_address,
        owner: result.owner,
        fee_type: result.fee_type,
        percentage_fee: result.percentage_fee
      };
    } catch (error) {
      throw new Error(`Failed to get contract info: ${error}`);
    }
  }

  /**
   * Check if a token is supported by the contract
   * @param tokenAddress Token address to check
   * @returns Object with supported status and price feed ID
   */
  async isTokenSupported(
    tokenAddress: string
  ): Promise<{ supported: boolean; priceFeedId: string }> {
    try {
      const result =
        await this.autoswapprContract.get_token_from_status_and_value(
          tokenAddress
        );
      return {
        supported: result.supported,
        priceFeedId: result.price_feed_id
      };
    } catch (error) {
      throw new Error(`Failed to check token support: ${error}`);
    }
  }

  /**
   * Get token information
   * @param tokenAddress Token address
   * @returns Token information or null if not found
   */
  getTokenInfo(tokenAddress: string): TokenInfo | null {
    return getTokenInfo(tokenAddress);
  }

  /**
   * Get pool configuration for a token pair
   * @param token0 First token address
   * @param token1 Second token address
   * @returns Pool configuration or null if not found
   */
  getPoolConfig(token0: string, token1: string): PoolConfig | null {
    return getPoolConfig(token0, token1);
  }

  /**
   * Create a token contract instance
   * @param tokenAddress Token contract address
   * @returns ERC20 contract instance
   */
  private createTokenContract(tokenAddress: string): Contract {
    return new Contract(ERC20_ABI, tokenAddress, this.account);
  }

  /**
   * Get token balance for the connected account
   * @param tokenAddress Token address
   * @returns Token balance as Uint256
   */
  async getTokenBalance(
    tokenAddress: string
  ): Promise<{ low: string; high: string }> {
    try {
      const tokenContract = this.createTokenContract(tokenAddress);
      const balance = await tokenContract.balance_of(this.account.address);
      return balance.balance;
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error}`);
    }
  }

  /**
   * Get token allowance for the AutoSwappr contract
   * @param tokenAddress Token address
   * @returns Token allowance as Uint256
   */
  async getTokenAllowance(
    tokenAddress: string
  ): Promise<{ low: string; high: string }> {
    try {
      const tokenContract = this.createTokenContract(tokenAddress);
      const allowance = await tokenContract.allowance(
        this.account.address,
        this.config.contractAddress
      );
      return allowance.remaining;
    } catch (error) {
      throw new Error(`Failed to get token allowance: ${error}`);
    }
  }

  /**
   * Approve tokens for the AutoSwappr contract
   * @param tokenAddress Token address
   * @param amount Amount to approve (in wei)
   * @returns Transaction result
   */
  async approveTokens(tokenAddress: string, amount: string): Promise<any> {
    try {
      const tokenContract = this.createTokenContract(tokenAddress);
      const approveAmount = uint256.bnToUint256(amount);

      const result = await tokenContract.invoke(
        "approve",
        [this.config.contractAddress, approveAmount],
        {
          maxFee: "100000000000000" // Set a reasonable max fee (0.1 ETH in wei)
        }
      );
      console.log(`Approval transaction hash: ${result.transaction_hash}`);
      return result;
    } catch (error) {
      throw new Error(`Failed to approve tokens: ${error}`);
    }
  }

  /**
   * Create swap data for ekubo_manual_swap
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param options Swap options
   * @returns SwapData object
   */
  createSwapData(
    tokenIn: string,
    tokenOut: string,
    options: SwapOptions
  ): SwapData {
    // Get pool configuration
    const poolConfig = this.getPoolConfig(tokenIn, tokenOut);
    if (!poolConfig) {
      throw new Error(AutoSwapprError.INVALID_POOL_CONFIG);
    }

    // Determine if input token is token1
    const isToken1 = options.isToken1 ?? tokenIn === poolConfig.token1;

    // Create swap parameters
    const swapParams = {
      amount: {
        mag: cairo.uint256(options.amount),
        sign: false
      },
      sqrt_ratio_limit: options.sqrtRatioLimit || poolConfig.sqrt_ratio_limit,
      is_token1: isToken1,
      skip_ahead: options.skipAhead || 0
    };

    // Create pool key
    const poolKey = {
      token0: poolConfig.token0,
      token1: poolConfig.token1,
      fee: poolConfig.fee,
      tick_spacing: poolConfig.tick_spacing,
      extension: poolConfig.extension
    };

    return {
      params: swapParams,
      pool_key: poolKey,
      caller: this.account.address
    };
  }

  /**
   * Execute ekubo manual swap
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param options Swap options
   * @returns Swap result
   */
  async executeEkuboManualSwap(
    tokenIn: string,
    tokenOut: string,
    options: SwapOptions
  ) {
    try {
      // Validate inputs
      if (!options.amount || options.amount === "0") {
        throw new Error(AutoSwapprError.ZERO_AMOUNT);
      }

      // Check if input token is supported
      // const { supported } = await this.isTokenSupported(tokenIn);
      // if (!supported) {
      //   throw new Error(AutoSwapprError.UNSUPPORTED_TOKEN);
      // }

      // Check token balance
      const balance = await this.getTokenBalance(tokenIn);
      console.log("token balance", balance);
      console.log("options.amount", options.amount);
      // if (balance < options.amount) {
      //   throw new Error(AutoSwapprError.INSUFFICIENT_BALANCE);
      // }

      // Check allowance
      // const allowance = await this.getTokenAllowance(tokenIn);
      // if (uint256.uint256ToBN(allowance) < uint256.uint256ToBN(amountUint256)) {
      //   throw new Error(AutoSwapprError.INSUFFICIENT_ALLOWANCE);
      // }

      // Create swap data
      const swapData = this.createSwapData(tokenIn, tokenOut, options);

      console.log("Executing Ekubo manual swap...");
      console.log("Swap data:", JSON.stringify(swapData, null, 2));

      const approveCall = {
        contractAddress: tokenIn,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: this.config.contractAddress,
          amount: cairo.uint256(options.amount)
        })
      };

      const swapCall = {
        contractAddress: this.config.contractAddress,
        entrypoint: "ekubo_manual_swap",
        calldata: CallData.compile({
          swapData
        })
      };

      const result = await this.account.execute(
        [approveCall, swapCall],
        undefined,
        {
          maxFee: "100000000000000"
        }
      );

      console.log("Transaction hash:", result);

      return { result };
    } catch (error) {
      console.error("Swap failed:", error);
      throw error;
    }
  }

  /**
   * Estimate gas for ekubo manual swap
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param options Swap options
   * @returns Estimated gas
   */
  async estimateSwapGas(
    tokenIn: string,
    tokenOut: string,
    options: SwapOptions
  ): Promise<string> {
    try {
      const swapData = this.createSwapData(tokenIn, tokenOut, options);

      // Try to estimate gas using the contract method
      const estimatedGas =
        await this.autoswapprContract.ekubo_manual_swap.estimateGas(swapData);
      return estimatedGas.overall_fee.toString();
    } catch (error) {
      // Fallback to a reasonable estimate if estimation fails
      console.warn("Gas estimation failed, using fallback value:", error);
      return "0x100000000000000"; // 0.1 ETH in wei as fallback
    }
  }

  /**
   * Listen for swap successful events
   * @param callback Callback function to handle events
   */
  onSwapSuccessful(callback: (event: any) => void): void {
    this.autoswapprContract.on("SwapSuccessful", callback);
  }

  /**
   * Remove swap successful event listener
   */
  offSwapSuccessful(): void {
    this.autoswapprContract.off("SwapSuccessful");
  }

  /**
   * Get account address
   * @returns Account address
   */
  getAccountAddress(): string {
    return this.account.address;
  }

  /**
   * Get contract address
   * @returns Contract address
   */
  getContractAddress(): string {
    return this.config.contractAddress;
  }
}
