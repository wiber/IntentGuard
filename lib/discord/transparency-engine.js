/**
 * src/discord/transparency-engine.ts — Public Trust-Debt Reporting
 *
 * The bot self-documents trust-debt spikes to a public Discord channel.
 * Anyone can see when the system's trust scores change significantly.
 *
 * CHANNEL: #trust-debt-public
 *
 * REPORTS:
 *   - Trust-debt spikes (delta > threshold)
 *   - Periodic summaries (every N minutes)
 *   - Permission denials (FIM blocked a tool call)
 *   - Category health changes
 *
 * WHY:
 *   The Transparency Engine is how IntentGuard proves it's not a black box.
 *   Every significant trust-debt change is visible to the public channel.
 *   This is the foundation of IAMFIM — the system can show its work.
 */
export class TransparencyEngine {
    log;
    discord;
    config;
    channelId;
    spikeHistory = [];
    reportTimer;
    constructor(log, config) {
        this.log = log;
        this.config = {
            enabled: config?.enabled ?? true,
            publicChannelName: config?.publicChannelName ?? 'trust-debt-public',
            spikeThreshold: config?.spikeThreshold ?? 0.1,
            reportIntervalMs: config?.reportIntervalMs ?? 600_000, // 10 minutes
            autoPost: config?.autoPost ?? true,
        };
    }
    /**
     * Bind to Discord and start periodic reporting.
     */
    start(discord, channelId) {
        this.discord = discord;
        this.channelId = channelId;
        if (this.config.autoPost && this.config.reportIntervalMs > 0) {
            this.reportTimer = setInterval(() => {
                this.postPeriodicSummary().catch(err => this.log.error(`Transparency periodic report failed: ${err}`));
            }, this.config.reportIntervalMs);
        }
        this.log.info(`TransparencyEngine started → #${this.config.publicChannelName} (threshold: ${this.config.spikeThreshold})`);
    }
    /**
     * Stop periodic reporting.
     */
    stop() {
        if (this.reportTimer) {
            clearInterval(this.reportTimer);
            this.reportTimer = undefined;
        }
    }
    /**
     * Record a trust-debt spike. Posts to Discord if above threshold.
     */
    async recordSpike(spike) {
        this.spikeHistory.push(spike);
        // Trim history to last 1000 entries
        if (this.spikeHistory.length > 1000) {
            this.spikeHistory = this.spikeHistory.slice(-500);
        }
        if (Math.abs(spike.delta) >= this.config.spikeThreshold) {
            this.log.info(`Trust-debt spike: ${spike.category} ${spike.delta > 0 ? '+' : ''}${spike.delta.toFixed(3)} (${spike.source})`);
            await this.postSpike(spike);
        }
    }
    /**
     * Record a FIM permission denial with Discord embed formatting.
     * Posts to #trust-debt-public with tool name, overlap score, sovereignty, and resolution.
     */
    async recordDenial(toolName, skillName, overlap, sovereignty, threshold, failedCategories, resolution) {
        // CEO-grade Intelligence Burst format
        const hardness = overlap < 0.3 ? 'H1-CRITICAL' : overlap < 0.5 ? 'H2-HIGH' : 'H3-MEDIUM';
        const overlapPct = (overlap * 100).toFixed(0);
        const thresholdPct = (threshold * 100).toFixed(0);
        // Embed-style formatting for Discord (rich text with structure)
        const message = [
            `🛡️ **FIM PERMISSION DENIED**`,
            ``,
            `**Tool:** \`${toolName}\` (skill: \`${skillName}\`)`,
            `**Hardness:** ${hardness}`,
            `**Overlap Score:** ${overlapPct}% (threshold: ${thresholdPct}%)`,
            `**Sovereignty:** ${sovereignty.toFixed(3)}`,
            `**Failed Categories:** ${failedCategories.join(', ') || 'N/A'}`,
            `**Resolution:** ${resolution}`,
            `**Time:** ${new Date().toISOString()}`,
            ``,
            `*This denial was logged to fim-denials.jsonl and triggered heat map update.*`,
        ].join('\n');
        await this.postToChannel(message);
    }
    /**
     * Post a spike event to the public channel.
     */
    async postSpike(spike) {
        const direction = spike.delta > 0 ? '📈' : '📉';
        const severity = Math.abs(spike.delta) >= 0.2 ? '🔴' : Math.abs(spike.delta) >= 0.15 ? '🟡' : '🟢';
        // CEO-grade Intelligence Burst format
        const hardness = Math.abs(spike.delta) >= 0.2 ? 'H1' : Math.abs(spike.delta) >= 0.1 ? 'H2' : 'H3';
        const overlap = spike.newScore;
        const message = [
            `${direction} ${severity} **Trust-Debt Spike** — \`${spike.category}\``,
            `📡 ${hardness} | 🎯 Overlap: ${(overlap * 100).toFixed(0)}%`,
            `Score: ${spike.previousScore.toFixed(3)} → ${spike.newScore.toFixed(3)} (${spike.delta > 0 ? '+' : ''}${spike.delta.toFixed(3)})`,
            `Source: ${spike.source}`,
            `PATENT: Appendix H — ${spike.category}`,
            `${spike.details}`,
        ].join('\n');
        await this.postToChannel(message);
    }
    /**
     * Post periodic summary of trust-debt health.
     */
    async postPeriodicSummary() {
        const now = Date.now();
        const windowMs = this.config.reportIntervalMs;
        const recentSpikes = this.spikeHistory.filter(s => now - new Date(s.timestamp).getTime() < windowMs);
        if (recentSpikes.length === 0)
            return; // Nothing to report
        const categories = new Map();
        for (const spike of recentSpikes) {
            const current = categories.get(spike.category) ?? 0;
            categories.set(spike.category, current + spike.delta);
        }
        const lines = [...categories.entries()]
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .map(([cat, delta]) => {
            const icon = delta > 0 ? '📈' : '📉';
            return `${icon} \`${cat}\`: ${delta > 0 ? '+' : ''}${delta.toFixed(3)}`;
        });
        const message = [
            `**Trust-Debt Summary** (last ${Math.round(windowMs / 60000)} min)`,
            `Spikes: ${recentSpikes.length}`,
            ``,
            ...lines,
        ].join('\n');
        await this.postToChannel(message);
    }
    /**
     * Post to the public trust-debt channel.
     */
    async postToChannel(content) {
        if (!this.discord?.sendToChannel || !this.channelId)
            return;
        try {
            await this.discord.sendToChannel(this.channelId, content);
        }
        catch (err) {
            this.log.error(`TransparencyEngine post failed: ${err}`);
        }
    }
    /**
     * Get spike history for analysis.
     */
    getHistory(limit = 50) {
        return this.spikeHistory.slice(-limit);
    }
}
//# sourceMappingURL=transparency-engine.js.map