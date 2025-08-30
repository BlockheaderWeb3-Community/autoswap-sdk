#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { Provider } from 'starknet';
import { AutoSwappr } from './src/autoswappr';
import { TOKEN_ADDRESSES } from './src/constants/pools';
import * as readline from 'readline';

// Define TOKENS alias for cleaner code
const TOKENS = TOKEN_ADDRESSES;

// Load environment variables
dotenv.config();

interface SwapTestConfig {
  privateKey: string;
  accountAddress: string;
  contractAddress: string;
  rpcUrl: string;
  testAmount: string;
}

class StrkUsdcSwapTester {
  private config: SwapTestConfig;
  private autoswappr: AutoSwappr;
  private rl: readline.Interface;

  constructor() {
    this.config = this.validateConfig();
    
    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Initialize AutoSwappr
    this.autoswappr = new AutoSwappr({
      contractAddress: this.config.contractAddress,
      rpcUrl: this.config.rpcUrl,
      accountAddress: this.config.accountAddress,
      privateKey: this.config.privateKey,
    });
  }

  private validateConfig(): SwapTestConfig {
    const requiredVars = {
      privateKey: process.env.PRIVATE_KEY,
      accountAddress: process.env.ACCOUNT_ADDRESS,
      contractAddress: process.env.CONTRACT_ADDRESS,
      rpcUrl: process.env.RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
      testAmount: process.env.TEST_AMOUNT_STRK || '0.1',
    };

    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        throw new Error(`Missing required environment variable: ${key.toUpperCase()}`);
      }
    }

    return requiredVars as SwapTestConfig;
  }

  private async promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim().toLowerCase());
      });
    });
  }

  private formatNumber(value: string | number, decimals: number = 6): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(decimals);
  }

  private async waitForTransactionConfirmation(txHash: string): Promise<void> {
    const provider = new Provider({ nodeUrl: this.config.rpcUrl });
    const maxAttempts = 60; // Wait up to 5 minutes (60 * 5 seconds)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt) {
          // Check if transaction is successful using the status field
          if ('status' in receipt && receipt.status === 'ACCEPTED_ON_L2') {
            // eslint-disable-next-line no-console
            console.log('✅ Transaction confirmed successfully!');
            return;
          } else if ('status' in receipt && receipt.status === 'REJECTED') {
            // eslint-disable-next-line no-console
            console.log('❌ Transaction was rejected!');
            return;
          }
        }
        
        // Wait 5 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
        if (attempts % 12 === 0) { // Show progress every minute (12 * 5 seconds)
          // eslint-disable-next-line no-console
          console.log(`   Still waiting... (${Math.floor(attempts / 12)} minute(s) elapsed)`);
        }
        
      } catch (error) {
        // Transaction might not be found yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }
    
    // eslint-disable-next-line no-console
    console.log('⏰ Timeout waiting for transaction confirmation. Proceeding anyway...');
  }

  private async checkBalances(): Promise<{ strkBalance: string; usdcBalance: string }> {
    try {
      // eslint-disable-next-line no-console
      console.log('💰 Checking token balances...');
      
      // Get provider from autoswappr
      const provider = new Provider({ nodeUrl: this.config.rpcUrl });
      
      const strkBalanceResult = await provider.callContract({
        contractAddress: TOKENS.STRK,
        entrypoint: 'balance_of',
        calldata: [this.config.accountAddress],
      });
      
      console.log('STRK Balance Result:', strkBalanceResult);
      
      // Parse balance properly for StarkNet v7+
      let strkBalanceRaw: bigint;
      if (Array.isArray(strkBalanceResult) && strkBalanceResult.length >= 2) {
        // Handle Uint256 format: [low, high]
        strkBalanceRaw = BigInt(strkBalanceResult[0]) + (BigInt(strkBalanceResult[1]) << 128n);
      } else {
        // Handle single value format
        strkBalanceRaw = BigInt(strkBalanceResult[0] || '0');
      }
      
      console.log('STRK Balance Raw:', strkBalanceRaw.toString());
      const strkBalance = (Number(strkBalanceRaw) / 10 ** 18).toString(); // STRK has 18 decimals
      
      // Get USDC balance
      const usdcBalanceResult = await provider.callContract({
        contractAddress: TOKENS.USDC,
        entrypoint: 'balance_of',
        calldata: [this.config.accountAddress],
      });
      
      console.log('USDC Balance Result:', usdcBalanceResult);
      
      // Parse USDC balance properly
      let usdcBalanceRaw: bigint;
      if (Array.isArray(usdcBalanceResult) && usdcBalanceResult.length >= 2) {
        // Handle Uint256 format: [low, high]
        usdcBalanceRaw = BigInt(usdcBalanceResult[0]) + (BigInt(usdcBalanceResult[1]) << 128n);
      } else {
        // Handle single value format
        usdcBalanceRaw = BigInt(usdcBalanceResult[0] || '0');
      }
      
      console.log('USDC Balance Raw:', usdcBalanceRaw.toString());
      const usdcBalance = (Number(usdcBalanceRaw) / 10 ** 6).toString(); // USDC has 6 decimals
      
      // eslint-disable-next-line no-console
      console.log(`   STRK Balance: ${this.formatNumber(strkBalance)} STRK`);
      // eslint-disable-next-line no-console
      console.log(`   USDC Balance: ${this.formatNumber(usdcBalance)} USDC`);
      
      return { strkBalance, usdcBalance };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('⚠️  Could not fetch balances:', error instanceof Error ? error.message : 'Unknown error');
      return { strkBalance: 'Unknown', usdcBalance: 'Unknown' };
    }
  }

  async runSwapTest(): Promise<void> {
    try {
      console.log('🚀 STRK → USDC Swap Integration Test\n');
      
      console.log('✅ Configuration:');
      console.log(`   Account: ${this.config.accountAddress}`);
      console.log(`   RPC: ${this.config.rpcUrl}`);
      console.log(`   Contract: ${this.config.contractAddress}`);
      console.log(`   Amount: ${this.config.testAmount} STRK\n`);

      // Check balances
      const balances = await this.checkBalances();
      console.log();

      // Validate sufficient balance
      if (balances.strkBalance !== 'Unknown' && parseFloat(balances.strkBalance) < parseFloat(this.config.testAmount)) {
        console.log('❌ Insufficient STRK balance for swap!');
        console.log(`   Required: ${this.config.testAmount} STRK`);
        console.log(`   Available: ${balances.strkBalance} STRK`);
        this.rl.close();
        return;
      }

      // Get swap quote
      console.log('🔍 Getting swap quote...');
      const quote = await this.autoswappr.getSwapQuote(
        TOKENS.STRK,
        TOKENS.USDC,
        { amount: this.config.testAmount }
      );

      console.log('\n📊 Swap Quote:');
      console.log(`   Input: ${quote.inputAmount} STRK`);
      console.log(`   Output: ${this.formatNumber(quote.outputAmount)} USDC`);
      console.log(`   Exchange Rate: 1 STRK = ${this.formatNumber(quote.exchangeRate)} USDC`);
      console.log(`   Price Impact: ${this.formatNumber(quote.priceImpact, 2)}%`);
      console.log(`   Pool Fee: ${this.formatNumber(quote.poolFee, 2)}%`);
      console.log(`   Estimated Gas: ${quote.estimatedGas}`);

      // Calculate potential profit/loss
      const inputValue = parseFloat(quote.inputAmount);
      const outputValue = parseFloat(quote.outputAmount);
      const exchangeRate = parseFloat(quote.exchangeRate);
      
      console.log('\n💡 Swap Summary:');
      console.log(`   You will send: ${inputValue} STRK`);
      console.log(`   You will receive: ~${this.formatNumber(outputValue)} USDC`);
      console.log(`   Rate: 1 STRK = ${this.formatNumber(exchangeRate)} USDC`);

      // Prompt for confirmation
      console.log('\n⚠️  WARNING: This will execute a REAL swap with your funds!');
      const confirmation = await this.promptUser('Do you want to proceed with the swap? (y/N): ');

      if (confirmation === 'y' || confirmation === 'yes') {
        console.log('\n🔄 Executing swap...');
        
        const swapResult = await this.autoswappr.executeSwap(
          TOKENS.STRK,
          TOKENS.USDC,
          { amount: this.config.testAmount }
        );

        console.log('✅ Swap executed successfully!');
        console.log(`   Transaction Hash: ${swapResult.result.transaction_hash}`);
        console.log(`   Status: Pending confirmation`);
        
        // Wait for transaction confirmation
        console.log('\n⏳ Waiting for transaction confirmation...');
        await this.waitForTransactionConfirmation(swapResult.result.transaction_hash);
        
        // Check balances after swap
        console.log('\n💰 Updated balances:');
        await this.checkBalances();
        
      } else {
        console.log('\n❌ Swap cancelled by user');
      }

    } catch (error) {
      console.error('\n💥 Swap test failed:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } finally {
      this.rl.close();
    }
  }
}

// Main execution
async function main() {
  try {
    const tester = new StrkUsdcSwapTester();
    await tester.runSwapTest();
  } catch (error) {
    console.error('❌ Test setup failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
