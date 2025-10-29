import { ethers } from "ethers";
import { AutoSwapprBase } from "../lib/src/autoswappr-base";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  const CNGN_DECIMALS = 6;
  const config = {
    rpcUrl: process.env.BASE_RPC || "",
    privateKey,
  };

  console.log("🚀 Initializing Autoswappr Base Swap SDK...\n");
  const sdk = new AutoSwapprBase(config);

  // Get pool information
  console.log("📊 Pool Information:");
  const poolInfo = await sdk.getPoolInfo();
  console.log(`Token0: ${poolInfo.token0}`);
  console.log(`Token1: ${poolInfo.token1}`);
  console.log(`Tick Spacing: ${poolInfo.tickSpacing}`);
  console.log(`Liquidity: ${poolInfo.liquidity.toString()}`);
  console.log(`Current Tick: ${poolInfo.tick}`);

  // Get initial balances
  console.log("\n💰 Initial Balances:");
  const initialBalances = await sdk.getBalances();
  console.log(`USDC: ${initialBalances.usdc}`);
  console.log(`CNGN: ${initialBalances.cngn}`);

  // Define swap parameters
  const swapParams = {
    amountIn: "0.1", // 0.25 USDC
    slippageBps: 100, // 1% slippage
  };

  // Get quote
  console.log("\n📈 Getting quote...");
  const quote = await sdk.getQuote(swapParams);

  // Calculate exchange rate properly
  const amountInNum = parseFloat(swapParams.amountIn);
  const amountOutFormatted = ethers.formatUnits(quote.amountOut, CNGN_DECIMALS);
  const exchangeRate = parseFloat(amountOutFormatted) / amountInNum;

  console.log(
    `Quote: ${swapParams.amountIn} USDC → ${amountOutFormatted} CNGN`
  );
  console.log(
    `Minimum Out: ${ethers.formatUnits(quote.amountOutMin, CNGN_DECIMALS)} CNGN`
  );
  console.log(`Exchange Rate: 1 USDC = ${exchangeRate.toFixed(6)} CNGN`);
  console.log(
    `Slippage Tolerance: ${
      swapParams.slippageBps
        ? (swapParams.slippageBps / 100).toFixed(2)
        : "0.50"
    }%`
  );

  // Debug: show raw values
  console.log(`\n   [DEBUG] Raw amountOut: ${quote.amountOut.toString()}`);
  console.log(`[DEBUG] CNGN decimals used: ${CNGN_DECIMALS}`);

  // Uncomment below to execute the swap

  console.log("\n🔄 Executing swap...");
  const receipt = await sdk.swap(swapParams);

  // // Get final balances
  console.log("\n💰 Final Balances:");
  const finalBalances = await sdk.getBalances();
  console.log(`USDC: ${finalBalances.usdc}`);
  console.log(`CNGN: ${finalBalances.cngn}`);

  console.log("\n✅ Swap completed successfully!");
  console.log(`Transaction: ${receipt.hash}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

  console.log("\n✅ Quote fetched successfully!");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

export { main as runDemo };
