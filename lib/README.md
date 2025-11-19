# AutoSwappr SDK

A modern TypeScript SDK for interacting with the AutoSwappr contract on StarkNet. Built with StarkNet.js v7+ for optimal performance and reliability.

## Features

- 💰 **Get Swap Quotes** - Preview swap rates and fees before execution
- 🔄 **Execute Swaps** - Seamlessly swap tokens through Ekubo DEX
- 📊 **Real-time Data** - Accurate pricing from live contract simulation
- ⛽ **Gas Estimation** - Precise transaction cost calculation
- 🛡️ **Enhanced Error Handling** - Detailed error context and recovery
- 📝 **Full TypeScript Support** - Complete type definitions and IntelliSense
- 🚀 **StarkNet.js v7** - Latest StarkNet integration

## Installation

```bash
npm install autoswap-sdk
```

## Supported Tokens

The SDK supports the following tokens on StarkNet:

- **STRK** - Starknet Token
- **ETH** - Ether
- **USDC** - USD Coin
- **USDT** - Tether USD
- **WBTC** - Wrapped Bitcoin

## AutoSwappr Contract

**Mainnet Address:**

```
0x05582ad635c43b4c14dbfa53cbde0df32266164a0d1b36e5b510e5b34aeb364b
```

## Quick Start

### Basic Setup

```typescript
import { AutoSwappr, TOKEN_ADDRESSES } from 'autoswap-sdk';

// Initialize the SDK
const autoswappr = new AutoSwappr({
  contractAddress:
    '0x05582ad635c43b4c14dbfa53cbde0df32266164a0d1b36e5b510e5b34aeb364b',
  rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
  accountAddress: 'YOUR_ACCOUNT_ADDRESS',
  privateKey: 'YOUR_PRIVATE_KEY',
});
```

### Get Swap Quote (Recommended)

Always get a quote before executing a swap to preview the expected output and fees:

```typescript
try {
  // Get quote for swapping 1 ETH to USDC
  const quote = await autoswappr.getSwapQuote(
    TOKEN_ADDRESSES.STRK,
    TOKEN_ADDRESSES.USDC,
    { amount: '1.0' }
  );

  console.log('Quote Details:');
  console.log(`Input: ${quote.inputAmount} ETH`);
  console.log(`Output: ${quote.outputAmount} USDC`);
  console.log(`Exchange Rate: ${quote.exchangeRate}`);
  console.log(`Price Impact: ${quote.priceImpact}%`);
  console.log(`Pool Fee: ${quote.poolFee}%`);
  console.log(`Estimated Gas: ${quote.estimatedGas}`);
} catch (error) {
  console.error('Quote failed:', error.message);
}
```

### Execute Swap

```typescript
try {
  // Execute the swap
  const result = await autoswappr.executeSwap(
    TOKEN_ADDRESSES.STRK,
    TOKEN_ADDRESSES.USDC,
    { amount: '1.0' }
  );

  console.log('Swap successful!');
  console.log('Transaction hash:', result.result.transaction_hash);
} catch (error) {
  console.error('Swap failed:', error.message);
}
```

## Advanced Usage

### Complete Swap Workflow

```typescript
import {
  AutoSwappr,
  TOKEN_ADDRESSES,
  AutoSwapprSDKError,
  AutoSwapprError,
} from 'autoswap-sdk';

async function performSwap() {
  const autoswappr = new AutoSwappr({
    contractAddress:
      '0x05582ad635c43b4c14dbfa53cbde0df32266164a0d1b36e5b510e5b34aeb364b',
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
    accountAddress: 'YOUR_ACCOUNT_ADDRESS',
    privateKey: 'YOUR_PRIVATE_KEY',
  });

  try {
    // Step 1: Get quote
    const quote = await autoswappr.getSwapQuote(
      TOKEN_ADDRESSES.STRK,
      TOKEN_ADDRESSES.USDC,
      { amount: '100' }
    );

    // Step 2: Check if quote is acceptable
    if (parseFloat(quote.priceImpact) > 5.0) {
      console.warn(`High price impact: ${quote.priceImpact}%`);
      return;
    }

    console.log(
      `Swapping ${quote.inputAmount} STRK for ~${quote.outputAmount} USDC`
    );
    console.log(`Gas estimate: ${quote.estimatedGas}`);

    // Step 3: Execute swap
    const result = await autoswappr.executeSwap(
      TOKEN_ADDRESSES.STRK,
      TOKEN_ADDRESSES.USDC,
      { amount: '100' }
    );

    console.log('✅ Swap completed successfully!');
    console.log('Transaction:', result.result.transaction_hash);
  } catch (error) {
    if (error instanceof AutoSwapprSDKError) {
      switch (error.code) {
        case AutoSwapprError.INSUFFICIENT_BALANCE:
          console.error('❌ Insufficient token balance');
          break;
        case AutoSwapprError.UNSUPPORTED_TOKEN:
          console.error('❌ Token pair not supported');
          break;
        case AutoSwapprError.INVALID_POOL_CONFIG:
          console.error('❌ No liquidity pool found');
          break;
        default:
          console.error('❌ Swap failed:', error.message);
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}
```

### Custom Swap Options

```typescript
// Advanced swap with custom parameters
const quote = await autoswappr.getSwapQuote(
  TOKEN_ADDRESSES.ETH,
  TOKEN_ADDRESSES.WBTC,
  {
    amount: '0.5',
    isToken1: false, // Specify token order in pool
    skipAhead: 0, // Skip ahead parameter for Ekubo
    sqrtRatioLimit: undefined, // Custom price limit
  }
);
```

## API Reference

### AutoSwappr Class

#### Constructor

```typescript
new AutoSwappr(config: AutoSwapprConfig)
```

**Parameters:**

- `config.contractAddress` - AutoSwappr contract address
- `config.rpcUrl` - StarkNet RPC endpoint URL
- `config.accountAddress` - Your account address
- `config.privateKey` - Your account private key

#### Methods

##### getSwapQuote()

```typescript
async getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  options: SwapOptions
): Promise<SwapQuote>
```

Get a quote for a token swap without executing the transaction.

**Parameters:**

- `tokenIn` - Input token address
- `tokenOut` - Output token address
- `options.amount` - Amount to swap (in token units, e.g., "1.5")
- `options.isToken1?` - Whether input token is token1 in pool
- `options.skipAhead?` - Skip ahead parameter
- `options.sqrtRatioLimit?` - Custom sqrt ratio limit

**Returns:** `SwapQuote` object with:

- `inputAmount` - Input amount
- `outputAmount` - Expected output amount
- `exchangeRate` - Exchange rate (output/input)
- `priceImpact` - Price impact percentage
- `poolFee` - Pool fee percentage
- `estimatedGas` - Estimated gas cost

##### executeSwap()

```typescript
async executeSwap(
  tokenIn: string,
  tokenOut: string,
  options: SwapOptions
): Promise<{ result: InvokeFunctionResponse }>
```

Execute a token swap transaction.

**Parameters:** Same as `getSwapQuote()`

**Returns:** Transaction result object

### Error Handling

The SDK uses `AutoSwapprSDKError` for enhanced error handling:

```typescript
import { AutoSwapprSDKError, AutoSwapprError } from 'autoswap-sdk';

try {
  await autoswappr.executeSwap(tokenA, tokenB, { amount: '1.0' });
} catch (error) {
  if (error instanceof AutoSwapprSDKError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Original error:', error.originalError);
  }
}
```

**Error Codes:**

- `ZERO_AMOUNT` - Amount must be greater than zero
- `UNSUPPORTED_TOKEN` - Token not supported by the SDK
- `INVALID_POOL_CONFIG` - Unable to fetch pool configuration
- `INSUFFICIENT_BALANCE` - Insufficient token balance
- `SWAP_FAILED` - General swap execution failure
- `QUOTE_FAILED` - Quote generation failure
- `NETWORK_ERROR` - Network connectivity issues
- `RPC_ERROR` - StarkNet RPC errors
- `CONTRACT_ERROR` - Smart contract errors

## Token Addresses

```typescript
import { TOKEN_ADDRESSES } from 'autoswap-sdk';

console.log(TOKEN_ADDRESSES.STRK); // Starknet Token
console.log(TOKEN_ADDRESSES.ETH); // Ether
console.log(TOKEN_ADDRESSES.USDC); // USD Coin
console.log(TOKEN_ADDRESSES.USDT); // Tether USD
console.log(TOKEN_ADDRESSES.WBTC); // Wrapped Bitcoin
```

## Requirements

- Node.js 16+
- StarkNet.js v7+
- Valid StarkNet account with private key

## Security Considerations

1. **Private Key Management**: Never expose private keys in client-side code or version control
2. **Amount Validation**: Always validate swap amounts before execution
3. **Slippage Protection**: Check price impact in quotes before swapping
4. **Gas Estimation**: Review gas estimates to avoid failed transactions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For support and questions, please open an issue on GitHub.

## License

MIT
