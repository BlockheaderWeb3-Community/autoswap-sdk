# Local Testing Guide for AutoSwap SDK

This guide will help you test the AutoSwap SDK with your real StarkNet account before creating a PR.

## 🔧 Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

Fill in your `.env` file:

```bash
# Your StarkNet account private key (without 0x prefix)
PRIVATE_KEY=your_actual_private_key_here

# Your StarkNet account address
ACCOUNT_ADDRESS=your_actual_account_address_here

# AutoSwappr contract address (default provided)
CONTRACT_ADDRESS=0x05582ad635c43b4c14dbfa53cbde0df32266164a0d1b36e5b510e5b34aeb364b

# StarkNet RPC URL (default: BlastAPI mainnet)
RPC_URL=https://starknet-mainnet.public.blastapi.io

# Test amounts (in token units, not wei)
TEST_AMOUNT_STRK=0.1
TEST_AMOUNT_ETH=0.001
```

### 3. Build the SDK

```bash
yarn build
```

## 🧪 Running Tests

### Unit Tests (Mocked)

```bash
yarn test
```

### Integration Tests (Real Network)

```bash
yarn test:integration
```

## 🚀 What the Integration Test Does

The integration test will:

1. **Validate Configuration**: Check that all required environment variables are set
2. **Test Quote Functionality**:
   - Get quotes for STRK → USDC
   - Get quotes for ETH → USDC
   - Test reverse quotes (USDC → STRK)
3. **Test Error Handling**:
   - Zero amount errors
   - Invalid token errors
4. **Simulate Swap Execution**: Shows what a real swap would do (without executing)

## 📊 Expected Output

```
🚀 Starting AutoSwappr SDK Integration Tests

✅ Configuration validated
📍 Account: 0x1234...
🔗 RPC: https://starknet-mainnet.public.blastapi.io
📄 Contract: 0x05582...

🔍 Testing getSwapQuote...

📊 Getting quote for 0.1 STRK -> USDC
✅ STRK -> USDC Quote:
   Input: 0.1 STRK
   Output: 0.045 USDC
   Exchange Rate: 0.45
   Price Impact: 0.12%
   Pool Fee: 0.05%
   Estimated Gas: 50000

📊 Getting quote for 0.001 ETH -> USDC
✅ ETH -> USDC Quote:
   Input: 0.001 ETH
   Output: 2.45 USDC
   Exchange Rate: 2450
   Price Impact: 0.08%
   Pool Fee: 0.05%
   Estimated Gas: 50000

🧪 Testing error handling...
✅ Zero amount error handled correctly
✅ Invalid token error handled correctly

⚠️  SWAP EXECUTION TEST
This will execute a REAL swap with your funds!
Make sure you want to proceed before running this test.

🔍 Simulating swap execution (not actually executing)...
📋 Swap Summary:
   You would swap: 0.1 STRK
   You would receive: ~0.045 USDC
   Price impact: 0.12%
   Estimated gas: 50000

💡 To execute this swap, uncomment the executeSwap call in the code

🎉 All tests completed successfully!
```

## 🔒 Security Notes

- **Never commit your `.env` file** - it contains your private key
- **Start with small amounts** for testing
- **Test on testnet first** if possible
- **Double-check quotes** before executing real swaps

## 🛠 Troubleshooting

### Common Issues:

1. **"Missing required environment variables"**
   - Make sure your `.env` file exists and has all required fields

2. **"Network error" or RPC issues**
   - Try a different RPC endpoint
   - Check your internet connection

3. **"Insufficient balance" errors**
   - Make sure you have enough tokens in your account
   - Check that you have ETH for gas fees

4. **"Invalid pool config" errors**
   - The token pair might not be supported
   - Try different token combinations

### Getting Your Private Key:

**From Argent X:**

1. Open Argent X extension
2. Go to Settings → Account → Export Private Key
3. Copy the private key (remove the 0x prefix for the .env file)

**From Braavos:**

1. Open Braavos extension
2. Go to Settings → Privacy and Security → Export Private Key
3. Copy the private key (remove the 0x prefix for the .env file)

## 🚀 Ready for Production?

Once your integration tests pass:

1. **Review the quotes** - Make sure they look reasonable
2. **Test actual swapping** - Uncomment the executeSwap call if you want to test real swaps
3. **Consider testnet testing** - Test on StarkNet testnet first
4. **Create your PR** - You're ready to contribute!

## 📝 Next Steps

After successful testing:

- Document any issues you found
- Consider adding more test cases
- Update the README if needed
- Create your pull request with confidence!
