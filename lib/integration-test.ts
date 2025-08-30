import * as dotenv from 'dotenv';
import { AutoSwappr } from './src/autoswappr';
import { Account, RpcProvider } from 'starknet';
import { TOKEN_ADDRESSES } from './src/constants/pools';

// Load environment variables
dotenv.config();

interface TestConfig {
  privateKey: string;
  accountAddress: string;
  contractAddress: string;
  rpcUrl: string;
  testAmountStrk: string;
  testAmountEth: string;
  testAmountUsdc: string;
  testAmountUsdt: string;
  testAmountWbtc: string;
}


class IntegrationTester {
  private config: TestConfig;
  private autoSwappr: AutoSwappr;
  private account: Account;

  constructor() {
    this.config = this.loadConfig();
    this.setupStarkNet();
  }

  private loadConfig(): TestConfig {
    const requiredEnvVars = [
      'PRIVATE_KEY',
      'ACCOUNT_ADDRESS', 
      'CONTRACT_ADDRESS',
      'RPC_URL'
    ];

    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      privateKey: process.env.PRIVATE_KEY!,
      accountAddress: process.env.ACCOUNT_ADDRESS!,
      contractAddress: process.env.CONTRACT_ADDRESS!,
      rpcUrl: process.env.RPC_URL!,
      testAmountStrk: process.env.TEST_AMOUNT_STRK || '0.1',
      testAmountEth: process.env.TEST_AMOUNT_ETH || '0.001',
      testAmountUsdc: process.env.TEST_AMOUNT_USDC || '1.0',
      testAmountUsdt: process.env.TEST_AMOUNT_USDT || '1.0',
      testAmountWbtc: process.env.TEST_AMOUNT_WBTC || '0.00001',
    };
  }

  private setupStarkNet(): void {
    const provider = new RpcProvider({ nodeUrl: this.config.rpcUrl });
    this.account = new Account(provider, this.config.accountAddress, this.config.privateKey);
    this.autoSwappr = new AutoSwappr({
      contractAddress: this.config.contractAddress,
      rpcUrl: this.config.rpcUrl,
      accountAddress: this.config.accountAddress,
      privateKey: this.config.privateKey,
    });
  }

  private validateConfig(): void {
    const required = ['privateKey', 'accountAddress'];
    const missing = required.filter(key => !this.config[key as keyof TestConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // eslint-disable-next-line no-console
    console.log('✅ Configuration validated');
    // eslint-disable-next-line no-console
    console.log(`📍 Account: ${this.config.accountAddress}`);
    // eslint-disable-next-line no-console
    console.log(`🔗 RPC: ${this.config.rpcUrl}`);
    // eslint-disable-next-line no-console
    console.log(`📄 Contract: ${this.config.contractAddress}`);
  }

  async testGetSwapQuote(): Promise<void> {
    console.log('\n🔍 Testing getSwapQuote...');
    
    try {
      // Test STRK -> USDC quote
      console.log(`\n📊 Getting quote for ${this.config.testAmountStrk} STRK -> USDC`);
      const quote1 = await this.autoSwappr.getSwapQuote(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        { amount: this.config.testAmountStrk }
      );

      console.log('✅ STRK -> USDC Quote:');
      console.log(`   Input: ${quote1.inputAmount} STRK`);
      console.log(`   Output: ${quote1.outputAmount} USDC`);
      console.log(`   Exchange Rate: ${quote1.exchangeRate}`);
      console.log(`   Price Impact: ${quote1.priceImpact}%`);
      console.log(`   Pool Fee: ${quote1.poolFee}%`);
      console.log(`   Estimated Gas: ${quote1.estimatedGas}`);

      // Test ETH -> USDC quote
      console.log(`\n📊 Getting quote for ${this.config.testAmountEth} ETH -> USDC`);
      const quote2 = await this.autoSwappr.getSwapQuote(
        TOKEN_ADDRESSES.ETH,
        TOKEN_ADDRESSES.USDC,
        { amount: this.config.testAmountEth }
      );

      console.log('✅ ETH -> USDC Quote:');
      console.log(`   Input: ${quote2.inputAmount} ETH`);
      console.log(`   Output: ${quote2.outputAmount} USDC`);
      console.log(`   Exchange Rate: ${quote2.exchangeRate}`);
      console.log(`   Price Impact: ${quote2.priceImpact}%`);
      console.log(`   Pool Fee: ${quote2.poolFee}%`);
      console.log(`   Estimated Gas: ${quote2.estimatedGas}`);

      // Test reverse quote
      console.log(`\n📊 Getting quote for ${quote1.outputAmount} USDC -> STRK`);
      const quote3 = await this.autoSwappr.getSwapQuote(
        TOKEN_ADDRESSES.USDC,
        TOKEN_ADDRESSES.STRK,
        { amount: quote1.outputAmount }
      );

      console.log('✅ USDC -> STRK Quote:');
      console.log(`   Input: ${quote3.inputAmount} USDC`);
      console.log(`   Output: ${quote3.outputAmount} STRK`);
      console.log(`   Exchange Rate: ${quote3.exchangeRate}`);

    } catch (error) {
      console.error('❌ Error getting swap quote:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async testErrorHandling(): Promise<void> {
    console.log('\n🧪 Testing error handling...');

    try {
      // Test zero amount
      console.log('Testing zero amount error...');
      await this.autoSwappr.getSwapQuote(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        { amount: '0' }
      );
      console.log('❌ Should have thrown error for zero amount');
    } catch (error) {
      console.log('✅ Zero amount error handled correctly');
    }

    try {
      // Test invalid token
      console.log('Testing invalid token error...');
      await this.autoSwappr.getSwapQuote(
        '0xinvalidtoken',
        TOKEN_ADDRESSES.USDC,
        { amount: '1.0' }
      );
      console.log('❌ Should have thrown error for invalid token');
    } catch (error) {
      console.log('✅ Invalid token error handled correctly');
    }
  }



  async runAllTests(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🚀 Starting AutoSwappr SDK Integration Tests\n');
    
    this.validateConfig();
    
    try {
      await this.testGetSwapQuote();
      await this.testErrorHandling();
      
      // eslint-disable-next-line no-console
      console.log('\n🎉 All tests completed successfully!');
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    }
  }
}

// Run the tests
async function main() {
  const tester = new IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { IntegrationTester };
