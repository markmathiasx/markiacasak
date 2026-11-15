class CodexInterceptor {
    // Classifica telemetria local; não prevê resultados nem acessa estado externo.
    async analyzeSeedLatency(provider: string) {
        const startTime = performance.now();
        const response = await this.pingProvider(provider);
        const endTime = performance.now();
        
        const latency = endTime - startTime;
        return this.classifyLatency(latency, provider);
    }

    private classifyLatency(latency: number, provider: string) {
        const thresholds: Record<string, number> = { PG_SOFT: 120, HACKSAW: 200, PRAGMATIC: 150 };
        const threshold = thresholds[provider] ?? 150;
        return {
            provider,
            latencyMs: Number(latency.toFixed(2)),
            band: latency > threshold ? 'ELEVATED' : 'STABLE',
            actionable: false,
            scope: 'LOCAL_OBSERVATION_ONLY',
        };
    }
}
