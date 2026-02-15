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
import type { SkillContext, SkillResult } from '../types.js';
/**
 * Revenue source types for future expansion
 */
export declare enum RevenueSource {
    CRYPTO_WALLET = "crypto_wallet",// BTC/ETH/SOL wallet payments
    CRYPTO_SMART_CONTRACT = "crypto_contract",// Smart contract revenues
    API_USAGE = "api_usage",// Pay-per-use API calls
    SUBSCRIPTION = "subscription",// Monthly/annual subscriptions
    CONSULTING = "consulting",// Professional services
    SUPPORT = "support",// Technical support contracts
    PLAYGROUND_USAGE = "playground_usage",// tesseract.nu playground fees
    AGENT_POOL_FEES = "agent_pool_fees",// Claude Flow agent pool usage
    GRANT = "grant",// Research/development grants
    INVESTMENT = "investment",// Equity/token investments
    DONATION = "donation",// Open-source donations
    OTHER = "other"
}
/**
 * Payment method enum (future implementation)
 */
export declare enum PaymentMethod {
    BITCOIN = "bitcoin",
    ETHEREUM = "ethereum",
    SOLANA = "solana",
    LIGHTNING = "lightning",
    CREDIT_CARD = "credit_card",
    BANK_TRANSFER = "bank_transfer",
    PAYPAL = "paypal",
    MANUAL = "manual",
    OTHER = "other"
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
export default class RevenueIntake {
    name: string;
    description: string;
    private log;
    private ledger;
    private dataDir;
    initialize(ctx: SkillContext): Promise<void>;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Record incoming revenue
     */
    recordRevenue(source: RevenueSource, amount: number, currency: string | undefined, paymentMethod: PaymentMethod | undefined, description: string, metadata?: Record<string, unknown>): RevenueRecord;
    /**
     * STUB: Crypto wallet setup
     *
     * Future implementation:
     * - BTC/ETH/SOL wallet address generation
     * - Lightning Network node setup
     * - Smart contract deployment for automated revenue
     * - Webhook integration for payment notifications
     */
    setupCryptoWallet(chain: 'bitcoin' | 'ethereum' | 'solana'): SkillResult;
    /**
     * STUB: Service configuration for API/subscription revenue
     *
     * Future implementation:
     * - API key generation for pay-per-use
     * - Subscription tier management
     * - Usage metering and billing cycles
     * - Integration with payment processors (Stripe, etc.)
     */
    configureServiceRevenue(serviceType: 'api' | 'subscription' | 'playground'): SkillResult;
    /**
     * STUB: Invoice generation
     *
     * Future implementation:
     * - Professional invoice generation (PDF/HTML)
     * - Invoice tracking and reminders
     * - Payment link generation
     * - Integration with accounting systems
     */
    generateInvoice(customerId: string, items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
    }>, dueDate: Date): SkillResult;
    /**
     * Get revenue analytics by source
     */
    getRevenueBySource(): Record<string, number>;
    /**
     * Get total revenue for a period
     */
    getTotalRevenue(days?: number): number;
    private handleRecordRevenue;
    private handleGenerateInvoice;
    private handleRevenueAnalytics;
    private handleCryptoSetup;
    private handleServiceConfig;
    /**
     * Get current FIM sovereignty score (stub)
     *
     * Future: Wire to actual FIM sovereignty monitoring
     */
    private getCurrentSovereignty;
}
//# sourceMappingURL=revenue-intake.d.ts.map