/**
 * 获取指定时区的日期字符串
 * @param date 日期对象，默认为当前时间
 * @param timezone 时区，默认为UTC+8
 * @returns YYYY-MM-DD格式的日期字符串
 */
export declare function getDateStringInTimezone(date?: Date, timezone?: string): string;
/**
 * 费用计算器
 * 根据不同模型的token使用量计算费用
 */
export declare class CostCalculator {
    private static MODEL_PRICING;
    /**
     * 计算单个模型的使用费用
     * @param usage Token使用情况
     * @param model 模型名称
     * @returns 费用计算结果
     */
    static calculateCost(usage: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
    }, model: string): {
        costs: {
            input: number;
            output: number;
            cache_create: number;
            cache_read: number;
            total: number;
        };
        pricing: any;
        model: string;
    };
    /**
     * 获取所有支持的模型列表
     */
    static getSupportedModels(): string[];
    /**
     * 获取模型的定价信息
     */
    static getModelPricing(model: string): any;
    /**
     * 添加或更新模型定价
     */
    static updateModelPricing(model: string, pricing: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
    }): void;
}
//# sourceMappingURL=costCalculator.d.ts.map