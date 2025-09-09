interface ModelPricing {
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    cache_creation_input_token_cost?: number;
    cache_read_input_token_cost?: number;
    litellm_provider?: string;
}
interface CostCalculationResult {
    inputCost: number;
    outputCost: number;
    cacheCreateCost: number;
    cacheReadCost: number;
    ephemeral5mCost: number;
    ephemeral1hCost: number;
    totalCost: number;
    hasPricing: boolean;
    isLongContextRequest: boolean;
    pricing: {
        input: number;
        output: number;
        cacheCreate: number;
        cacheRead: number;
        ephemeral1h: number;
    };
}
interface Usage {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation?: {
        ephemeral_5m_input_tokens?: number;
        ephemeral_1h_input_tokens?: number;
    };
}
declare class PricingService {
    private dataDir;
    private pricingFile;
    private pricingUrl;
    private fallbackFile;
    private pricingData;
    private lastUpdated;
    private updateInterval;
    private fileWatcher;
    private reloadDebounceTimer;
    private ephemeral1hPricing;
    private longContextPricing;
    constructor();
    initialize(): Promise<void>;
    private checkAndUpdatePricing;
    private needsUpdate;
    private downloadPricingData;
    private _downloadFromRemote;
    private loadPricingData;
    private useFallbackPricing;
    getModelPricing(modelName: string): ModelPricing | null;
    private ensureCachePricing;
    private getEphemeral1hPricing;
    calculateCost(usage: Usage, modelName: string): CostCalculationResult;
    formatCost(cost: number): string;
    getStatus(): {
        initialized: boolean;
        lastUpdated: Date | null;
        modelCount: number;
        nextUpdate: Date | null;
    };
    private setupFileWatcher;
    private handleFileChange;
    private reloadPricingData;
    cleanup(): void;
}
export declare const pricingService: PricingService;
export default pricingService;
//# sourceMappingURL=pricingService.d.ts.map