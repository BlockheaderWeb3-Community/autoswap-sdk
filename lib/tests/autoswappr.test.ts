import { AutoSwappr, TOKEN_ADDRESSES } from '../src';
import { AutoSwapprError, AutoSwapprSDKError } from '../src/types';

// Mock types for testing
interface MockContract {
  call: jest.MockedFunction<(method: string, params: unknown[]) => Promise<string>>;
}

interface MockAccount {
  address: string;
  execute: jest.MockedFunction<(calls: unknown[], options?: unknown) => Promise<{ transaction_hash: string }>>;
  estimateFee: jest.MockedFunction<(calls: unknown[]) => Promise<{ overall_fee: string }>>;
}

// Mock external dependencies
jest.mock('starknet', () => ({
  RpcProvider: jest.fn().mockImplementation(() => ({})),
  Account: jest.fn().mockImplementation(() => ({
    address: '0xmockaddress',
    execute: jest.fn(),
    estimateFee: jest.fn().mockResolvedValue({ overall_fee: '50000' }),
  })),
  Contract: jest.fn().mockImplementation(() => ({
    call: jest.fn(),
  })),
  cairo: {
    uint256: jest.fn().mockImplementation((value) => ({ low: value, high: '0' })),
  },
  CallData: {
    compile: jest.fn().mockImplementation((data) => data),
  },
}));

jest.mock('../src/utils/ekubo', () => ({
  getTopPoolAsConfig: jest.fn(),
}));

import { getTopPoolAsConfig } from '../src/utils/ekubo';

describe('AutoSwappr SDK', () => {
  const mockConfig = {
    contractAddress: '0x05582ad635c43b4c14dbfa53cbde0df32266164a0d1b36e5b510e5b34aeb364b',
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
    accountAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
  };

  const mockPoolConfig = {
    token0: TOKEN_ADDRESSES.STRK,
    token1: TOKEN_ADDRESSES.USDC,
    fee: '170141183460469235273462165868118016',
    tick_spacing: 1000,
    extension: '0x0',
    sqrt_ratio_limit: '18446748437148339061',
  };

  let autoswappr: AutoSwappr;

  beforeEach(() => {
    jest.clearAllMocks();
    autoswappr = new AutoSwappr(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize correctly with valid config', () => {
      expect(autoswappr).toBeInstanceOf(AutoSwappr);
    });

    it('should initialize with empty contract address', () => {
      const configWithEmptyContract = {
        ...mockConfig,
        contractAddress: '',
      };
      const instance = new AutoSwappr(configWithEmptyContract);
      expect(instance).toBeInstanceOf(AutoSwappr);
    });
  });

  describe('createSwapData', () => {
    beforeEach(() => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(mockPoolConfig);
    });

    it('should create valid swap data for STRK to USDC', async () => {
      const swapOptions = { amount: '1.0' };
      
      const swapData = await autoswappr.createSwapData(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        swapOptions
      );

      expect(swapData).toHaveProperty('params');
      expect(swapData).toHaveProperty('pool_key');
      expect(swapData).toHaveProperty('caller');
      expect(swapData.params).toHaveProperty('amount');
      expect(swapData.params).toHaveProperty('sqrt_ratio_limit');
      expect(swapData.params).toHaveProperty('is_token1');
      expect(swapData.params).toHaveProperty('skip_ahead');
      expect(swapData.caller).toBe('0xmockaddress');
    });

    it('should handle custom swap options', async () => {
      const swapOptions = {
        amount: '2.5',
        isToken1: true,
        skipAhead: 5,
        sqrtRatioLimit: '12345678901234567890',
      };

      const swapData = await autoswappr.createSwapData(
        TOKEN_ADDRESSES.ETH,
        TOKEN_ADDRESSES.USDC,
        swapOptions
      );

      expect(swapData.params.is_token1).toBe(true);
      expect(swapData.params.skip_ahead).toBe(5);
      expect(swapData.params.sqrt_ratio_limit).toBe('12345678901234567890');
    });

    it('should throw error for invalid pool config', async () => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(null);

      await expect(
        autoswappr.createSwapData('0xinvalid', '0xinvalid2', { amount: '1.0' })
      ).rejects.toThrow('INVALID_POOL_CONFIG');
    });
  });

  describe('getSwapQuote', () => {
    beforeEach(() => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(mockPoolConfig);
      
      // Mock contract simulation
      const mockContract = autoswappr['autoswapprContract'] as unknown as MockContract;
      mockContract.call = jest.fn().mockResolvedValue('1000000'); // 1 USDC in wei
    });

    it('should return valid quote for STRK to USDC swap', async () => {
      const swapOptions = { amount: '1.0' };
      
      const quote = await autoswappr.getSwapQuote(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        swapOptions
      );

      expect(quote).toHaveProperty('inputAmount', '1.0');
      expect(quote).toHaveProperty('outputAmount');
      expect(quote).toHaveProperty('inputToken', TOKEN_ADDRESSES.STRK);
      expect(quote).toHaveProperty('outputToken', TOKEN_ADDRESSES.USDC);
      expect(quote).toHaveProperty('priceImpact');
      expect(quote).toHaveProperty('exchangeRate');
      expect(quote).toHaveProperty('poolFee');
      expect(quote).toHaveProperty('estimatedGas');
    });

    it('should throw error for zero amount', async () => {
      await expect(
        autoswappr.getSwapQuote(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '0' })
      ).rejects.toThrow(AutoSwapprSDKError);

      await expect(
        autoswappr.getSwapQuote(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '0' })
      ).rejects.toThrow('Amount must be greater than zero');
    });

    it('should throw error for unsupported token', async () => {
      await expect(
        autoswappr.getSwapQuote('0xinvalid', TOKEN_ADDRESSES.USDC, { amount: '1.0' })
      ).rejects.toThrow(AutoSwapprSDKError);
    });

    it('should handle pool config fetch failure', async () => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(null);

      await expect(
        autoswappr.getSwapQuote(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '1.0' })
      ).rejects.toThrow(AutoSwapprSDKError);
    });

    it('should handle Ekubo API failure', async () => {
      // Store original fetch
      const originalFetch = global.fetch;
      
      // Mock fetch to simulate Ekubo API failure
      global.fetch = jest.fn().mockRejectedValue(new Error('API failed'));

      await expect(
        autoswappr.getSwapQuote(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '1.0' })
      ).rejects.toThrow('Failed to fetch quote from Ekubo API');
      
      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('executeSwap', () => {
    beforeEach(() => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(mockPoolConfig);
      
      const mockAccount = autoswappr['account'] as unknown as MockAccount;
      mockAccount.execute = jest.fn().mockResolvedValue({
        transaction_hash: '0xmocktxhash',
      });
    });

    it('should execute swap successfully', async () => {
      const swapOptions = { amount: '1.0' };
      
      const result = await autoswappr.executeSwap(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        swapOptions
      );

      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('transaction_hash', '0xmocktxhash');
    });

    it('should throw error for zero amount', async () => {
      await expect(
        autoswappr.executeSwap(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '0' })
      ).rejects.toThrow(AutoSwapprSDKError);
    });

    it('should throw error for unsupported input token', async () => {
      await expect(
        autoswappr.executeSwap('0xinvalid', TOKEN_ADDRESSES.USDC, { amount: '1.0' })
      ).rejects.toThrow(AutoSwapprSDKError);
    });

    it('should handle execution failure', async () => {
      const mockAccount = autoswappr['account'] as unknown as MockAccount;
      mockAccount.execute = jest.fn().mockRejectedValue(new Error('Execution failed'));

      await expect(
        autoswappr.executeSwap(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '1.0' })
      ).rejects.toThrow(AutoSwapprSDKError);
    });
  });

  describe('Error Handling', () => {
    it('should throw AutoSwapprSDKError with correct error codes', async () => {
      try {
        await autoswappr.getSwapQuote(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '0' });
      } catch (error) {
        expect(error).toBeInstanceOf(AutoSwapprSDKError);
        expect((error as AutoSwapprSDKError).code).toBe(AutoSwapprError.ZERO_AMOUNT);
      }
    });

    it('should handle network errors gracefully', async () => {
      (getTopPoolAsConfig as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        autoswappr.getSwapQuote(TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC, { amount: '1.0' })
      ).rejects.toThrow(AutoSwapprSDKError);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full quote-to-swap workflow', async () => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(mockPoolConfig);
      
      const mockContract = autoswappr['autoswapprContract'] as unknown as MockContract;
      mockContract.call = jest.fn().mockResolvedValue('1000000');
      
      const mockAccount = autoswappr['account'] as unknown as MockAccount;
      mockAccount.execute = jest.fn().mockResolvedValue({
        transaction_hash: '0xmocktxhash',
      });

      const swapOptions = { amount: '1.0' };

      // Get quote first
      const quote = await autoswappr.getSwapQuote(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        swapOptions
      );

      expect(quote.inputAmount).toBe('1.0');
      expect(Number(quote.outputAmount)).toBeGreaterThan(0);

      // Execute swap
      const swapResult = await autoswappr.executeSwap(
        TOKEN_ADDRESSES.STRK,
        TOKEN_ADDRESSES.USDC,
        swapOptions
      );

      expect(swapResult.result.transaction_hash).toBe('0xmocktxhash');
    });

    it('should handle multiple token pairs', async () => {
      (getTopPoolAsConfig as jest.Mock).mockResolvedValue(mockPoolConfig);
      
      const mockContract = autoswappr['autoswapprContract'] as unknown as MockContract;
      mockContract.call = jest.fn().mockResolvedValue('2000000');

      const tokenPairs = [
        [TOKEN_ADDRESSES.STRK, TOKEN_ADDRESSES.USDC],
        [TOKEN_ADDRESSES.ETH, TOKEN_ADDRESSES.USDT],
        [TOKEN_ADDRESSES.USDC, TOKEN_ADDRESSES.STRK],
      ];

      for (const [tokenIn, tokenOut] of tokenPairs) {
        const quote = await autoswappr.getSwapQuote(tokenIn, tokenOut, { amount: '1.0' });
        expect(quote.inputToken).toBe(tokenIn);
        expect(quote.outputToken).toBe(tokenOut);
        expect(Number(quote.outputAmount)).toBeGreaterThan(0);
      }
    });
  });
});
