import { ethers } from 'ethers';
import {
  AERODROME_V3_ROUTER,
  AERODROME_V3_QUOTER,
  AERODROME_V3_POOL_ADDRESS,
  USDC_ADDRESS,
  CNGN_ADDRESS,
  USDC_DECIMALS,
  CNGN_DECIMALS,
  SWAP_DEADLINE_S,
} from './constants/pools';
import {
  ERC20_ABI,
  AERODROME_V3_ROUTER_ABI,
  AERODROME_V3_QUOTER_ABI,
  AERODROME_V3_POOL_ABI,
} from './contracts/autoswappr-base-abi';
import { AutoSwapprBaseConfig, BaseSwapParams, BaseSwapQuote } from './types';

export class AutoSwapprBase {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private routerContract: ethers.Contract;
  private quoterContract: ethers.Contract;
  private poolContract: ethers.Contract;
  private usdcContract: ethers.Contract;
  private cngnContract: ethers.Contract;

  constructor(config: AutoSwapprBaseConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);

    this.routerContract = new ethers.Contract(
      AERODROME_V3_ROUTER,
      AERODROME_V3_ROUTER_ABI,
      this.signer
    );

    this.quoterContract = new ethers.Contract(
      AERODROME_V3_QUOTER,
      AERODROME_V3_QUOTER_ABI,
      this.signer
    );

    this.poolContract = new ethers.Contract(
      AERODROME_V3_POOL_ADDRESS,
      AERODROME_V3_POOL_ABI,
      this.provider
    );

    this.usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ERC20_ABI,
      this.signer
    );

    this.cngnContract = new ethers.Contract(
      CNGN_ADDRESS,
      ERC20_ABI,
      this.signer
    );
  }

  /** Get pool info */
  async getPoolInfo() {
    const [token0, token1, tickSpacing, liquidity, slot0] = await Promise.all([
      this.poolContract.token0(),
      this.poolContract.token1(),
      this.poolContract.tickSpacing(),
      this.poolContract.liquidity(),
      this.poolContract.slot0(),
    ]);

    return {
      token0,
      token1,
      tickSpacing: Number(tickSpacing),
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: Number(slot0[1]),
    };
  }

  /** Get quote for USDC -> CNGN */
 async getQuote(params: BaseSwapParams): Promise<BaseSwapQuote> {
  const slippageBps = params.slippageBps ?? 50;
  const amountIn = ethers.parseUnits(params.amountIn, USDC_DECIMALS);
  const fee = 10; // replace with actual pool fee if needed

  try {
    // Ethers v6: call view functions using callStatic
    const result = await this.quoterContract.quoteExactInputSingle(
      USDC_ADDRESS, // tokenIn
      CNGN_ADDRESS, // tokenOut
      amountIn,     // amountIn
      fee,          // fee / tick spacing
      0n            // sqrtPriceLimitX96
    );

    const [amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate] = result;

    const amountOutMin =
      (amountOut * BigInt(10000 - slippageBps)) / BigInt(10000);

    return {
      amountIn,
      amountOut,
      amountOutMin,
      tickSpacing: fee,
      sqrtPriceX96After,
      gasEstimate,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to get quote. Check your quoter ABI & arguments: ${error.message}`
    );
  }
}


  /** Ensure USDC approval */
  async ensureApproval(amountIn: bigint) {
    const signerAddress = await this.signer.getAddress();
    const currentAllowance = await this.usdcContract.allowance(
      signerAddress,
      AERODROME_V3_ROUTER
    );

    if (currentAllowance >= amountIn) return null;

    const tx = await this.usdcContract.approve(
      AERODROME_V3_ROUTER,
      ethers.MaxUint256
    );
    return tx.wait();
  }

  /** Execute swap USDC -> CNGN */
  async swap(params: BaseSwapParams) {
    const recipient = params.recipient ?? (await this.signer.getAddress());
    const quote = await this.getQuote(params);

    await this.ensureApproval(quote.amountIn);

    const deadline = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_S;

    const swapTx = await this.routerContract.exactInputSingle({
      tokenIn: USDC_ADDRESS,
      tokenOut: CNGN_ADDRESS,
      tickSpacing: quote.tickSpacing,
      recipient,
      deadline,
      amountIn: quote.amountIn,
      amountOutMinimum: quote.amountOutMin,
      sqrtPriceLimitX96: 0n,
    });

    return swapTx.wait();
  }

  /** Get token decimals */
  async getTokenDecimals() {
    const [usdcDecimals, cngnDecimals] = await Promise.all([
      this.usdcContract.decimals(),
      this.cngnContract.decimals(),
    ]);

    return {
      usdc: Number(usdcDecimals),
      cngn: Number(cngnDecimals),
    };
  }

  /** Get token balances */
  async getBalances(address?: string) {
    const target = address ?? (await this.signer.getAddress());

    const [usdcBalance, cngnBalance] = await Promise.all([
      this.usdcContract.balanceOf(target),
      this.cngnContract.balanceOf(target),
    ]);

    return {
      usdc: ethers.formatUnits(usdcBalance, USDC_DECIMALS),
      cngn: ethers.formatUnits(cngnBalance, CNGN_DECIMALS),
    };
  }
}
