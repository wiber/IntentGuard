/**
 * Tests for revenue-intake.ts
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import RevenueIntake, { RevenueSource, PaymentMethod, RevenueRecord } from './revenue-intake.js';
import type { SkillContext } from '../types.js';

const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'test-revenue-intake');
const TEST_LEDGER_PATH = path.join(TEST_DATA_DIR, 'wallet-ledger.jsonl');

describe('RevenueIntake', () => {
  let revenueIntake: RevenueIntake;
  let ctx: SkillContext;

  beforeEach(async () => {
    // Clean up test directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // Initialize revenue intake
    revenueIntake = new RevenueIntake();

    ctx = {
      log: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
      config: {
        get: (key: string) => {
          if (key === 'dataDir') return TEST_DATA_DIR;
          return undefined;
        },
      },
    } as SkillContext;

    await revenueIntake.initialize(ctx);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // Initialization Tests
  // ═══════════════════════════════════════════════════════════════

  describe('initialize', () => {
    it('should initialize revenue intake in stub mode', async () => {
      const intake = new RevenueIntake();
      await intake.initialize(ctx);

      expect(intake.name).toBe('revenue-intake');
      expect(intake.description).toContain('stub');
    });

    it('should create wallet ledger integration', async () => {
      // Ledger should be created automatically
      expect(fs.existsSync(TEST_LEDGER_PATH)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Revenue Recording Tests
  // ═══════════════════════════════════════════════════════════════

  describe('recordRevenue', () => {
    it('should record crypto wallet revenue', () => {
      const intake = revenueIntake.recordRevenue(
        RevenueSource.CRYPTO_WALLET,
        150.00,
        'USD',
        PaymentMethod.BITCOIN,
        'Bitcoin payment from client',
        { walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' }
      );

      expect(intake.source).toBe(RevenueSource.CRYPTO_WALLET);
      expect(intake.amount).toBe(150.00);
      expect(intake.currency).toBe('USD');
      expect(intake.paymentMethod).toBe(PaymentMethod.BITCOIN);
      expect(intake.metadata?.walletAddress).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    });

    it('should record API usage revenue', () => {
      const intake = revenueIntake.recordRevenue(
        RevenueSource.API_USAGE,
        25.50,
        'USD',
        PaymentMethod.CREDIT_CARD,
        'API usage for customer-123',
        { customerId: 'customer-123', requestCount: 1000 }
      );

      expect(intake.source).toBe(RevenueSource.API_USAGE);
      expect(intake.amount).toBe(25.50);
      expect(intake.metadata?.customerId).toBe('customer-123');
    });

    it('should record subscription revenue', () => {
      const intake = revenueIntake.recordRevenue(
        RevenueSource.SUBSCRIPTION,
        99.00,
        'USD',
        PaymentMethod.CREDIT_CARD,
        'Monthly subscription - Pro Plan',
        { tier: 'pro', period: 'monthly' }
      );

      expect(intake.source).toBe(RevenueSource.SUBSCRIPTION);
      expect(intake.amount).toBe(99.00);
      expect(intake.metadata?.tier).toBe('pro');
    });

    it('should record consulting revenue', () => {
      const intake = revenueIntake.recordRevenue(
        RevenueSource.CONSULTING,
        2500.00,
        'USD',
        PaymentMethod.BANK_TRANSFER,
        'Consulting project completion',
        { projectId: 'proj-456', hoursWorked: 50 }
      );

      expect(intake.source).toBe(RevenueSource.CONSULTING);
      expect(intake.amount).toBe(2500.00);
      expect(intake.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
    });

    it('should record grant revenue', () => {
      const intake = revenueIntake.recordRevenue(
        RevenueSource.GRANT,
        50000.00,
        'USD',
        PaymentMethod.BANK_TRANSFER,
        'Research grant from foundation',
        { grantId: 'grant-789', fundingBody: 'XYZ Foundation' }
      );

      expect(intake.source).toBe(RevenueSource.GRANT);
      expect(intake.amount).toBe(50000.00);
      expect(intake.metadata?.fundingBody).toBe('XYZ Foundation');
    });

    it('should append revenue to wallet ledger', () => {
      revenueIntake.recordRevenue(
        RevenueSource.API_USAGE,
        10.00,
        'USD',
        PaymentMethod.CREDIT_CARD,
        'API payment'
      );

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(1);

      const tx = JSON.parse(lines[0]);
      expect(tx.type).toBe('income');
      expect(tx.amount).toBe(10.00);
      expect(tx.category).toBe(RevenueSource.API_USAGE);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Crypto Wallet Setup Tests (Stub)
  // ═══════════════════════════════════════════════════════════════

  describe('setupCryptoWallet', () => {
    it('should return stub message for Bitcoin setup', () => {
      const result = revenueIntake.setupCryptoWallet('bitcoin');

      expect(result.success).toBe(false);
      expect(result.message).toContain('STUB');
      expect(result.message).toContain('bitcoin');
      expect(result.data?.stubMode).toBe(true);
      expect(Array.isArray(result.data?.plannedFeatures)).toBe(true);
    });

    it('should return stub message for Ethereum setup', () => {
      const result = revenueIntake.setupCryptoWallet('ethereum');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ethereum');
      expect(result.data?.stubMode).toBe(true);
    });

    it('should return stub message for Solana setup', () => {
      const result = revenueIntake.setupCryptoWallet('solana');

      expect(result.success).toBe(false);
      expect(result.message).toContain('solana');
      expect(result.data?.stubMode).toBe(true);
    });

    it('should list planned crypto features', () => {
      const result = revenueIntake.setupCryptoWallet('bitcoin');
      const features = result.data?.plannedFeatures as string[];

      expect(features.some(f => f.includes('Wallet address'))).toBe(true);
      expect(features.some(f => f.includes('webhook'))).toBe(true);
      expect(features.some(f => f.includes('Smart contract'))).toBe(true);
      expect(features.some(f => f.includes('Lightning Network'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Service Configuration Tests (Stub)
  // ═══════════════════════════════════════════════════════════════

  describe('configureServiceRevenue', () => {
    it('should return stub message for API configuration', () => {
      const result = revenueIntake.configureServiceRevenue('api');

      expect(result.success).toBe(false);
      expect(result.message).toContain('STUB');
      expect(result.message).toContain('api');
      expect(result.data?.stubMode).toBe(true);
    });

    it('should return stub message for subscription configuration', () => {
      const result = revenueIntake.configureServiceRevenue('subscription');

      expect(result.success).toBe(false);
      expect(result.message).toContain('subscription');
      expect(result.data?.stubMode).toBe(true);
    });

    it('should return stub message for playground configuration', () => {
      const result = revenueIntake.configureServiceRevenue('playground');

      expect(result.success).toBe(false);
      expect(result.message).toContain('playground');
      expect(result.data?.stubMode).toBe(true);
    });

    it('should list planned service features', () => {
      const result = revenueIntake.configureServiceRevenue('api');
      const features = result.data?.plannedFeatures as string[];

      expect(features.some(f => f.includes('API key'))).toBe(true);
      expect(features.some(f => f.includes('Subscription tier'))).toBe(true);
      expect(features.some(f => f.includes('Usage-based billing'))).toBe(true);
      expect(features.some(f => f.includes('tesseract.nu'))).toBe(true);
      expect(features.some(f => f.includes('Claude Flow'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Invoice Generation Tests (Stub)
  // ═══════════════════════════════════════════════════════════════

  describe('generateInvoice', () => {
    it('should return stub message for invoice generation', () => {
      const dueDate = new Date('2026-03-15');
      const items = [
        { description: 'Consulting services', quantity: 10, unitPrice: 150.00 },
        { description: 'API usage', quantity: 1, unitPrice: 25.00 },
      ];

      const result = revenueIntake.generateInvoice('customer-123', items, dueDate);

      expect(result.success).toBe(false);
      expect(result.message).toContain('STUB');
      expect(result.message).toContain('1525.00'); // 10*150 + 1*25
      expect(result.data?.stubMode).toBe(true);
    });

    it('should preview invoice details', () => {
      const dueDate = new Date('2026-03-15');
      const items = [
        { description: 'Professional services', quantity: 5, unitPrice: 200.00 },
      ];

      const result = revenueIntake.generateInvoice('customer-456', items, dueDate);
      const preview = result.data?.invoicePreview;

      expect(preview?.customerId).toBe('customer-456');
      expect(preview?.total).toBe(1000.00);
      expect(preview?.dueDate).toContain('2026-03-15');
      expect(preview?.items.length).toBe(1);
    });

    it('should list planned invoice features', () => {
      const result = revenueIntake.generateInvoice('customer-789', [], new Date());
      const features = result.data?.plannedFeatures as string[];

      expect(features.some(f => f.includes('PDF'))).toBe(true);
      expect(features.some(f => f.includes('Email'))).toBe(true);
      expect(features.some(f => f.includes('Payment links'))).toBe(true);
      expect(features.some(f => f.includes('tracking'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Analytics Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getRevenueBySource', () => {
    it('should return empty object when no revenue', () => {
      const bySource = revenueIntake.getRevenueBySource();

      expect(bySource).toStrictEqual({});
    });

    it('should group revenue by source', () => {
      revenueIntake.recordRevenue(RevenueSource.API_USAGE, 10.00, 'USD', PaymentMethod.CREDIT_CARD, 'API payment 1');
      revenueIntake.recordRevenue(RevenueSource.API_USAGE, 15.00, 'USD', PaymentMethod.CREDIT_CARD, 'API payment 2');
      revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 99.00, 'USD', PaymentMethod.CREDIT_CARD, 'Monthly sub');
      revenueIntake.recordRevenue(RevenueSource.CONSULTING, 500.00, 'USD', PaymentMethod.BANK_TRANSFER, 'Consulting');

      const bySource = revenueIntake.getRevenueBySource();

      expect(bySource[RevenueSource.API_USAGE]).toBe(25.00);
      expect(bySource[RevenueSource.SUBSCRIPTION]).toBe(99.00);
      expect(bySource[RevenueSource.CONSULTING]).toBe(500.00);
    });
  });

  describe('getTotalRevenue', () => {
    it('should return 0 when no revenue', () => {
      const total = revenueIntake.getTotalRevenue(7);

      expect(total).toBe(0);
    });

    it('should calculate total revenue for period', () => {
      revenueIntake.recordRevenue(RevenueSource.API_USAGE, 10.00, 'USD', PaymentMethod.CREDIT_CARD, 'Payment 1');
      revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 99.00, 'USD', PaymentMethod.CREDIT_CARD, 'Payment 2');
      revenueIntake.recordRevenue(RevenueSource.CONSULTING, 500.00, 'USD', PaymentMethod.BANK_TRANSFER, 'Payment 3');

      const total = revenueIntake.getTotalRevenue(7);

      expect(total).toBe(609.00);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Command Handler Tests
  // ═══════════════════════════════════════════════════════════════

  describe('execute - record', () => {
    it('should record revenue via command', async () => {
      const result = await revenueIntake.execute({
        action: 'record',
        source: RevenueSource.API_USAGE,
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        description: 'API usage payment',
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('50.00');
      expect(result.message).toContain('api_usage');
    });

    it('should require positive amount', async () => {
      const result = await revenueIntake.execute({
        action: 'record',
        source: RevenueSource.API_USAGE,
        amount: -10.00,
      }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain('positive amount');
    });

    it('should require revenue source', async () => {
      const result = await revenueIntake.execute({
        action: 'record',
        amount: 50.00,
      }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain('source');
    });
  });

  describe('execute - invoice', () => {
    it('should generate invoice stub via command', async () => {
      const result = await revenueIntake.execute({
        action: 'invoice',
        amount: 1000.00,
        description: 'Professional services',
        metadata: { customerId: 'customer-123' },
      }, ctx);

      expect(result.success).toBe(false); // Stub mode
      expect(result.message).toContain('STUB');
      expect(result.message).toContain('1000.00');
    });
  });

  describe('execute - analytics', () => {
    it('should generate revenue analytics via command', async () => {
      // Add some revenue
      revenueIntake.recordRevenue(RevenueSource.API_USAGE, 100.00, 'USD', PaymentMethod.CREDIT_CARD, 'Payment 1');
      revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 200.00, 'USD', PaymentMethod.CREDIT_CARD, 'Payment 2');

      const result = await revenueIntake.execute({
        action: 'analytics',
        period: 'weekly',
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Revenue Analytics');
      expect(result.message).toContain('300.00'); // Total revenue
      expect(result.data?.totalRevenue).toBe(300.00);
    });
  });

  describe('execute - crypto-setup', () => {
    it('should return crypto setup stub via command', async () => {
      const result = await revenueIntake.execute({
        action: 'crypto-setup',
        metadata: { chain: 'ethereum' },
      }, ctx);

      expect(result.success).toBe(false); // Stub mode
      expect(result.message).toContain('ethereum');
      expect(result.data?.stubMode).toBe(true);
    });
  });

  describe('execute - service-config', () => {
    it('should return service config stub via command', async () => {
      const result = await revenueIntake.execute({
        action: 'service-config',
        metadata: { serviceType: 'playground' },
      }, ctx);

      expect(result.success).toBe(false); // Stub mode
      expect(result.message).toContain('playground');
      expect(result.data?.stubMode).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Integration Tests
  // ═══════════════════════════════════════════════════════════════

  describe('Integration with WalletLedger', () => {
    it('should append revenue to wallet ledger', () => {
      revenueIntake.recordRevenue(
        RevenueSource.CRYPTO_WALLET,
        500.00,
        'USD',
        PaymentMethod.BITCOIN,
        'Bitcoin payment'
      );

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(1);

      const tx = JSON.parse(lines[0]);
      expect(tx.type).toBe('income');
      expect(tx.amount).toBe(500.00);
      expect(tx.category).toBe(RevenueSource.CRYPTO_WALLET);
      expect(tx.sovereigntyAtTime).toBeGreaterThan(0);
    });

    it('should track multiple revenue sources', () => {
      revenueIntake.recordRevenue(RevenueSource.API_USAGE, 10.00, 'USD', PaymentMethod.CREDIT_CARD, 'API');
      revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 99.00, 'USD', PaymentMethod.CREDIT_CARD, 'Sub');
      revenueIntake.recordRevenue(RevenueSource.CONSULTING, 1000.00, 'USD', PaymentMethod.BANK_TRANSFER, 'Consulting');

      const bySource = revenueIntake.getRevenueBySource();

      expect(Object.keys(bySource).length).toBe(3);
      expect(bySource[RevenueSource.API_USAGE]).toBe(10.00);
      expect(bySource[RevenueSource.SUBSCRIPTION]).toBe(99.00);
      expect(bySource[RevenueSource.CONSULTING]).toBe(1000.00);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Real-world Scenario Tests
  // ═══════════════════════════════════════════════════════════════

  describe('Real-world scenarios', () => {
    it('should handle mixed revenue streams', () => {
      // Month 1: Various revenue sources
      revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 99.00, 'USD', PaymentMethod.CREDIT_CARD, 'Pro plan - Customer A');
      revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 99.00, 'USD', PaymentMethod.CREDIT_CARD, 'Pro plan - Customer B');
      revenueIntake.recordRevenue(RevenueSource.API_USAGE, 45.00, 'USD', PaymentMethod.CREDIT_CARD, 'API overage - Customer C');
      revenueIntake.recordRevenue(RevenueSource.CONSULTING, 2500.00, 'USD', PaymentMethod.BANK_TRANSFER, 'Project Alpha');
      revenueIntake.recordRevenue(RevenueSource.CRYPTO_WALLET, 150.00, 'USD', PaymentMethod.BITCOIN, 'BTC payment');
      revenueIntake.recordRevenue(RevenueSource.GRANT, 10000.00, 'USD', PaymentMethod.BANK_TRANSFER, 'Research grant');

      const total = revenueIntake.getTotalRevenue(30);
      const bySource = revenueIntake.getRevenueBySource();

      expect(total).toBe(12893.00);
      expect(bySource[RevenueSource.SUBSCRIPTION]).toBe(198.00);
      expect(bySource[RevenueSource.API_USAGE]).toBe(45.00);
      expect(bySource[RevenueSource.CONSULTING]).toBe(2500.00);
      expect(bySource[RevenueSource.CRYPTO_WALLET]).toBe(150.00);
      expect(bySource[RevenueSource.GRANT]).toBe(10000.00);
    });

    it('should prepare for future crypto integration', () => {
      // Record crypto payment with full metadata
      const intake = revenueIntake.recordRevenue(
        RevenueSource.CRYPTO_WALLET,
        0.005, // BTC amount
        'BTC',
        PaymentMethod.BITCOIN,
        'Bitcoin payment for consulting',
        {
          walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          transactionHash: '0x123abc...',
          confirmations: 6,
          exchangeRate: 60000.00,
          usdValue: 300.00,
        }
      );

      expect(intake.metadata?.walletAddress).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(intake.metadata?.transactionHash).toBe('0x123abc...');
      expect(intake.metadata?.usdValue).toBe(300.00);
    });
  });
});
