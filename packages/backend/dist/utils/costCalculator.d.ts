interface ModelPricing {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
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
interface AggregatedUsage {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreateTokens?: number;
    cacheReadTokens?: number;
    totalInputTokens?: number;
    totalOutputTokens?: number;
    totalCacheCreateTokens?: number;
    totalCacheReadTokens?: number;
}
interface CostResult {
    model: string;
    pricing: ModelPricing;
    usingDynamicPricing: boolean;
    isLongContextRequest?: boolean;
    usage: {
        inputTokens: number;
        outputTokens: number;
        cacheCreateTokens: number;
        cacheReadTokens: number;
        totalTokens: number;
    };
    costs: {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
        total: number;
    };
    formatted: {
        input: string;
        output: string;
        cacheWrite: string;
        cacheRead: string;
        total: string;
    };
    debug: {
        isOpenAIModel: boolean;
        hasCacheCreatePrice: boolean;
        cacheCreateTokens: number;
        cacheWritePriceUsed: number;
        isLongContextModel?: boolean;
        isLongContextRequest?: boolean;
    };
}
interface CacheSavings {
    normalCost: number;
    cacheCost: number;
    savings: number;
    savingsPercentage: number;
    formatted: {
        normalCost: string;
        cacheCost: string;
        savings: string;
        savingsPercentage: string;
    };
}
export declare class CostCalculator {
    /**
     * 计算单次请求的费用
     */
    static calculateCost(usage: Usage, model?: string): CostResult;
    /**
     * 计算聚合使用量的费用
     */
    static calculateAggregatedCost(aggregatedUsage: AggregatedUsage, model?: string): CostResult;
    /**
     * 获取模型定价信息
     */
    static getModelPricing(model?: string): ModelPricing;
    /**
     * 获取所有支持的模型和定价
     */
    static getAllModelPricing(): Record<string, ModelPricing>;
    /**
     * 验证模型是否支持
     */
    static isModelSupported(model: string): boolean;
    /**
     * 格式化费用显示
     */
    static formatCost(cost: number, decimals?: number): string;
    /**
     * 计算费用节省（使用缓存的节省）
     */
    static calculateCacheSavings(usage: Usage, model?: string): CacheSavings;
}
export default CostCalculator;
//# sourceMappingURL=CostCalculator.d.ts.map