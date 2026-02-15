/**
 * src/skills/revenue-intake.ts — Revenue Intake Stub
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 *
 * Features:
 * - Placeholder for future crypto wallet integration
 * - Service revenue tracking (consulting, API usage, subscriptions)
 * - Grant/funding intake management
 * - Integration with wallet-ledger for append-only transaction logging
 * - Future-ready for tesseract.nu playground monetization
 * - Invoice generation stubs
 *
 * This is a STUB implementation — crypto/payment providers will be integrated later.
 */

import type { Logger, SkillContext, SkillResult } from '../types.js';
import WalletLedger from './wallet-ledger.js';
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/**
 * Revenue source types for future expansion
 */
export enum RevenueSource {
  // Crypto payments (future integration)
  CRYPTO_WALLET = 'crypto_wallet',           // BTC/ETH/SOL wallet payments
  CRYPTO_SMART_CONTRACT = 'crypto_contract', // Smart contract revenues

  // Service revenues
  API_USAGE = 'api_usage',                   // Pay-per-use API calls
  SUBSCRIPTION = 'subscription',             // Monthly/annual subscriptions
  CONSULTING = 'consulting',                 // Professional services
  SUPPORT = 'support',                       // Technical support contracts

  // Platform revenues
  PLAYGROUND_USAGE = 'playground_usage',     // tesseract.nu playground fees
  AGENT_POOL_FEES = 'agent_pool_fees',       // Claude Flow agent pool usage

  // Funding sources
  GRANT = 'grant',                           // Research/development grants
  INVESTMENT = 'investment',                 // Equity/token investments
  DONATION = 'donation',                     // Open-source donations

  // Other
  OTHER = 'other',
}

/**
 * Payment method enum (future implementation)
 */
export enum PaymentMethod {
  // Crypto (stub)
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
  LIGHTNING = 'lightning',

  // Traditional (stub)
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',

  // Other
  MANUAL = 'manual',
  OTHER = 'other',
}

/**
 * Revenue intake record
 */
export interface RevenueRecord {
  timestamp: string;
  source: RevenueSource;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description: string;
  metadata?: {
    invoiceId?: string;
    customerId?: string;
    walletAddress?: string;
    transactionHash?: string;
    [key: string]: unknown;
  };
}

/**
 * Invoice stub (future implementation)
 */
export interface InvoiceStub {
  invoiceId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

/**
 * Revenue command interface
 */
interface RevenueCommand {
  action: 'record' | 'invoice' | 'analytics' | 'crypto-setup' | 'service-config';
  source?: RevenueSource;
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  metadata?: Record<string, unknown>;
  period?: 'daily' | 'weekly' | 'monthly';
}

// ═══════════════════════════════════════════════════════════════
// RevenueIntake Class
// ═══════════════════════════════════════════════════════════════

export default class RevenueIntake {
  name = 'revenue-intake';
  description = 'Revenue intake stub for future crypto/service income integration';

  private log!: Logger;
  private ledger!: WalletLedger;
  private dataDir!: string;

  async initialize(ctx: SkillContext): Promise<void> {
    this.log = ctx.log;

    // Determine data directory
    const configDataDir = ctx.config.get('dataDir') as string | undefined;
    this.dataDir = configDataDir || join(process.cwd(), 'data');

    // Initialize wallet ledger integration
    this.ledger = new WalletLedger(this.dataDir);

    this.log.info('RevenueIntake initialized (stub mode — crypto/payment providers not yet integrated)');
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const cmd = command as RevenueCommand;

    try {
      switch (cmd.action) {
        case 'record':
          return this.handleRecordRevenue(cmd);

        case 'invoice':
          return this.handleGenerateInvoice(cmd);

        case 'analytics':
          return this.handleRevenueAnalytics(cmd);

        case 'crypto-setup':
          return this.handleCryptoSetup(cmd);

        case 'service-config':
          return this.handleServiceConfig(cmd);

        default:
          return {
            success: false,
            message: `Unknown revenue intake action: ${cmd.action}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.error(`Revenue intake execution failed: ${errorMessage}`);
      return {
        success: false,
        message: `Revenue intake error: ${errorMessage}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Public Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record incoming revenue
   */
  recordRevenue(
    source: RevenueSource,
    amount: number,
    currency: string = 'USD',
    paymentMethod: PaymentMethod = PaymentMethod.MANUAL,
    description: string,
    metadata?: Record<string, unknown>
  ): RevenueRecord {
    const intake: RevenueRecord = {
      timestamp: new Date().toISOString(),
      source,
      amount,
      currency,
      paymentMethod,
      description,
      metadata,
    };

    // Log to wallet ledger
    this.ledger.appendTransaction(
      'income',
      amount,
      source,
      description,
      this.getCurrentSovereignty()
    );

    this.log.info(`Revenue recorded: $${amount} from ${source} via ${paymentMethod}`);

    return intake;
  }

  /**
   * STUB: Crypto wallet setup
   *
   * Future implementation:
   * - BTC/ETH/SOL wallet address generation
   * - Lightning Network node setup
   * - Smart contract deployment for automated revenue
   * - Webhook integration for payment notifications
   */
  setupCryptoWallet(chain: 'bitcoin' | 'ethereum' | 'solana'): SkillResult {
    this.log.warn(`Crypto wallet setup is a stub — ${chain} integration not yet implemented`);

    return {
      success: false,
      message: `[STUB] Crypto wallet setup for ${chain} not yet implemented. Future integration planned.`,
      data: {
        stubMode: true,
        plannedFeatures: [
          'Wallet address generation',
          'Payment webhook notifications',
          'Smart contract revenue collection',
          'Multi-chain support (BTC/ETH/SOL)',
          'Lightning Network integration',
        ],
      },
    };
  }

  /**
   * STUB: Service configuration for API/subscription revenue
   *
   * Future implementation:
   * - API key generation for pay-per-use
   * - Subscription tier management
   * - Usage metering and billing cycles
   * - Integration with payment processors (Stripe, etc.)
   */
  configureServiceRevenue(serviceType: 'api' | 'subscription' | 'playground'): SkillResult {
    this.log.warn(`Service revenue configuration is a stub — ${serviceType} integration not yet implemented`);

    return {
      success: false,
      message: `[STUB] Service revenue configuration for ${serviceType} not yet implemented. Future integration planned.`,
      data: {
        stubMode: true,
        plannedFeatures: [
          'API key generation and metering',
          'Subscription tier management',
          'Usage-based billing',
          'Payment processor integration',
          'tesseract.nu playground monetization',
          'Claude Flow agent pool fee collection',
        ],
      },
    };
  }

  /**
   * STUB: Invoice generation
   *
   * Future implementation:
   * - Professional invoice generation (PDF/HTML)
   * - Invoice tracking and reminders
   * - Payment link generation
   * - Integration with accounting systems
   */
  generateInvoice(
    customerId: string,
    items: Array<{ description: string; quantity: number; unitPrice: number }>,
    dueDate: Date
  ): SkillResult {
    this.log.warn('Invoice generation is a stub — not yet implemented');

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    return {
      success: false,
      message: `[STUB] Invoice generation not yet implemented. Would generate invoice for $${total.toFixed(2)}`,
      data: {
        stubMode: true,
        invoicePreview: {
          customerId,
          items,
          total,
          dueDate: dueDate.toISOString(),
        },
        plannedFeatures: [
          'PDF invoice generation',
          'Email delivery',
          'Payment links (crypto + traditional)',
          'Invoice tracking and reminders',
          'Accounting system integration',
        ],
      },
    };
  }

  /**
   * Get revenue analytics by source
   */
  getRevenueBySource(): Record<string, number> {
    const transactions = this.ledger.getAllTransactions();
    const incomeTransactions = transactions.filter(tx => tx.type === 'income');

    const bySource: Record<string, number> = {};

    for (const tx of incomeTransactions) {
      bySource[tx.category] = (bySource[tx.category] || 0) + tx.amount;
    }

    return bySource;
  }

  /**
   * Get total revenue for a period
   */
  getTotalRevenue(days: number = 7): number {
    const transactions = this.ledger.getAllTransactions();
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return transactions
      .filter(tx => tx.type === 'income')
      .filter(tx => {
        const txDate = new Date(tx.timestamp);
        return txDate >= startDate && txDate <= now;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  // ═══════════════════════════════════════════════════════════════
  // Command Handlers
  // ═══════════════════════════════════════════════════════════════

  private handleRecordRevenue(cmd: RevenueCommand): SkillResult {
    if (!cmd.source || !cmd.amount || cmd.amount <= 0) {
      return {
        success: false,
        message: 'Revenue source and positive amount required',
      };
    }

    const currency = cmd.currency || 'USD';
    const paymentMethod = cmd.paymentMethod || PaymentMethod.MANUAL;
    const description = cmd.description || `Revenue from ${cmd.source}`;

    const intake = this.recordRevenue(
      cmd.source,
      cmd.amount,
      currency,
      paymentMethod,
      description,
      cmd.metadata
    );

    const newBalance = this.ledger.getBalance();

    return {
      success: true,
      message: `Revenue recorded: +$${cmd.amount.toFixed(2)} from ${cmd.source} via ${paymentMethod}. New balance: $${newBalance.toFixed(2)}`,
      data: { intake, balance: newBalance },
    };
  }

  private handleGenerateInvoice(cmd: RevenueCommand): SkillResult {
    return this.generateInvoice(
      cmd.metadata?.customerId as string || 'CUSTOMER-001',
      [
        {
          description: cmd.description || 'Professional services',
          quantity: 1,
          unitPrice: cmd.amount || 0,
        },
      ],
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    );
  }

  private handleRevenueAnalytics(cmd: RevenueCommand): SkillResult {
    const days = cmd.period === 'daily' ? 1 : cmd.period === 'weekly' ? 7 : 30;
    const totalRevenue = this.getTotalRevenue(days);
    const bySource = this.getRevenueBySource();
    const balance = this.ledger.getBalance();

    const sortedSources = Object.entries(bySource)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const summary = [
      `💰 Revenue Analytics (${cmd.period || 'weekly'})`,
      `Total Revenue: $${totalRevenue.toFixed(2)}`,
      `Current Balance: $${balance.toFixed(2)}`,
      ``,
      `Top Revenue Sources:`,
      ...sortedSources.map(([source, amount]) =>
        `  - ${source}: $${amount.toFixed(2)} (${((amount / totalRevenue) * 100).toFixed(1)}%)`
      ),
    ].join('\n');

    return {
      success: true,
      message: summary,
      data: {
        period: cmd.period || 'weekly',
        days,
        totalRevenue,
        bySource,
        balance,
        topSources: sortedSources.map(([source, amount]) => ({ source, amount })),
      },
    };
  }

  private handleCryptoSetup(cmd: RevenueCommand): SkillResult {
    const chain = (cmd.metadata?.chain as 'bitcoin' | 'ethereum' | 'solana') || 'bitcoin';
    return this.setupCryptoWallet(chain);
  }

  private handleServiceConfig(cmd: RevenueCommand): SkillResult {
    const serviceType = (cmd.metadata?.serviceType as 'api' | 'subscription' | 'playground') || 'api';
    return this.configureServiceRevenue(serviceType);
  }

  // ═══════════════════════════════════════════════════════════════
  // Internal Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current FIM sovereignty score (stub)
   *
   * Future: Wire to actual FIM sovereignty monitoring
   */
  private getCurrentSovereignty(): number {
    // Stub: return moderate sovereignty
    // Future: Read from FIM monitoring system
    return 0.75;
  }
}
