import { pricingService } from '../services/pricingService';

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

// Claude模型价格配置 (USD per 1M tokens) - 备用定价
const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 3.5 Sonnet
  'claude-3-5-sonnet-20241022': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3
  },
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3
  },

  // Claude 3.5 Haiku
  'claude-3-5-haiku-20241022': {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.3,
    cacheRead: 0.03
  },

  // Claude 3 Opus
  'claude-3-opus-20240229': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5
  },

  // Claude Opus 4.1 (新模型)
  'claude-opus-4-1-20250805': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5
  },

  // Claude 3 Sonnet
  'claude-3-sonnet-20240229': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3
  },

  // Claude 3 Haiku
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.3,
    cacheRead: 0.03
  },

  // 默认定价（用于未知模型）
  unknown: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3
  }
};

export class CostCalculator {
  /**
   * 计算单次请求的费用
   */
  static calculateCost(usage: Usage, model: string = 'unknown'): CostResult {
    // 如果 usage 包含详细的 cache_creation 对象或是 1M 模型，使用 pricingService 来处理
    if (
      (usage.cache_creation && typeof usage.cache_creation === 'object') ||
      (model && model.includes('[1m]'))
    ) {
      const result = pricingService.calculateCost(usage, model);
      // 转换 pricingService 返回的格式到 costCalculator 的格式
      return {
        model,
        pricing: {
          input: result.pricing.input * 1000000, // 转换为 per 1M tokens
          output: result.pricing.output * 1000000,
          cacheWrite: result.pricing.cacheCreate * 1000000,
          cacheRead: result.pricing.cacheRead * 1000000
        },
        usingDynamicPricing: true,
        isLongContextRequest: result.isLongContextRequest || false,
        usage: {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          cacheCreateTokens: usage.cache_creation_input_tokens || 0,
          cacheReadTokens: usage.cache_read_input_tokens || 0,
          totalTokens:
            (usage.input_tokens || 0) +
            (usage.output_tokens || 0) +
            (usage.cache_creation_input_tokens || 0) +
            (usage.cache_read_input_tokens || 0)
        },
        costs: {
          input: result.inputCost,
          output: result.outputCost,
          cacheWrite: result.cacheCreateCost,
          cacheRead: result.cacheReadCost,
          total: result.totalCost
        },
        formatted: {
          input: this.formatCost(result.inputCost),
          output: this.formatCost(result.outputCost),
          cacheWrite: this.formatCost(result.cacheCreateCost),
          cacheRead: this.formatCost(result.cacheReadCost),
          total: this.formatCost(result.totalCost)
        },
        debug: {
          isOpenAIModel: model.includes('gpt') || model.includes('o1'),
          hasCacheCreatePrice: !!result.pricing.cacheCreate,
          cacheCreateTokens: usage.cache_creation_input_tokens || 0,
          cacheWritePriceUsed: result.pricing.cacheCreate * 1000000,
          isLongContextModel: !!(model && model.includes('[1m]')),
          isLongContextRequest: result.isLongContextRequest || false
        }
      };
    }

    // 否则使用旧的逻辑（向后兼容）
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cacheCreateTokens = usage.cache_creation_input_tokens || 0;
    const cacheReadTokens = usage.cache_read_input_tokens || 0;

    // 优先使用动态价格服务
    const pricingData = pricingService.getModelPricing(model);
    let pricing: ModelPricing;
    let usingDynamicPricing = false;

    if (pricingData) {
      // 转换动态价格格式为内部格式
      const inputPrice = (pricingData.input_cost_per_token || 0) * 1000000; // 转换为per 1M tokens
      const outputPrice = (pricingData.output_cost_per_token || 0) * 1000000;
      const cacheReadPrice = (pricingData.cache_read_input_token_cost || 0) * 1000000;

      // OpenAI 模型的特殊处理：
      let cacheWritePrice = (pricingData.cache_creation_input_token_cost || 0) * 1000000;

      // 检测是否为 OpenAI 模型
      const isOpenAIModel =
        model.includes('gpt') || model.includes('o1') || pricingData.litellm_provider === 'openai';

      if (isOpenAIModel && !pricingData.cache_creation_input_token_cost && cacheCreateTokens > 0) {
        // OpenAI 模型：缓存创建按普通 input 价格计费
        cacheWritePrice = inputPrice;
      }

      pricing = {
        input: inputPrice,
        output: outputPrice,
        cacheWrite: cacheWritePrice,
        cacheRead: cacheReadPrice
      };
      usingDynamicPricing = true;
    } else {
      // 回退到静态价格
      pricing = MODEL_PRICING[model] || MODEL_PRICING['unknown'];
    }

    // 计算各类型token的费用 (USD)
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const cacheWriteCost = (cacheCreateTokens / 1000000) * pricing.cacheWrite;
    const cacheReadCost = (cacheReadTokens / 1000000) * pricing.cacheRead;

    const totalCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

    return {
      model,
      pricing,
      usingDynamicPricing,
      usage: {
        inputTokens,
        outputTokens,
        cacheCreateTokens,
        cacheReadTokens,
        totalTokens: inputTokens + outputTokens + cacheCreateTokens + cacheReadTokens
      },
      costs: {
        input: inputCost,
        output: outputCost,
        cacheWrite: cacheWriteCost,
        cacheRead: cacheReadCost,
        total: totalCost
      },
      formatted: {
        input: this.formatCost(inputCost),
        output: this.formatCost(outputCost),
        cacheWrite: this.formatCost(cacheWriteCost),
        cacheRead: this.formatCost(cacheReadCost),
        total: this.formatCost(totalCost)
      },
      debug: {
        isOpenAIModel: model.includes('gpt') || model.includes('o1'),
        hasCacheCreatePrice: !!pricingData?.cache_creation_input_token_cost,
        cacheCreateTokens,
        cacheWritePriceUsed: pricing.cacheWrite
      }
    };
  }

  /**
   * 计算聚合使用量的费用
   */
  static calculateAggregatedCost(aggregatedUsage: AggregatedUsage, model: string = 'unknown'): CostResult {
    const usage: Usage = {
      input_tokens: aggregatedUsage.inputTokens || aggregatedUsage.totalInputTokens || 0,
      output_tokens: aggregatedUsage.outputTokens || aggregatedUsage.totalOutputTokens || 0,
      cache_creation_input_tokens:
        aggregatedUsage.cacheCreateTokens || aggregatedUsage.totalCacheCreateTokens || 0,
      cache_read_input_tokens:
        aggregatedUsage.cacheReadTokens || aggregatedUsage.totalCacheReadTokens || 0
    };

    return this.calculateCost(usage, model);
  }

  /**
   * 获取模型定价信息
   */
  static getModelPricing(model: string = 'unknown'): ModelPricing {
    return MODEL_PRICING[model] || MODEL_PRICING['unknown'];
  }

  /**
   * 获取所有支持的模型和定价
   */
  static getAllModelPricing(): Record<string, ModelPricing> {
    return { ...MODEL_PRICING };
  }

  /**
   * 验证模型是否支持
   */
  static isModelSupported(model: string): boolean {
    return !!MODEL_PRICING[model];
  }

  /**
   * 格式化费用显示
   */
  static formatCost(cost: number, decimals: number = 6): string {
    if (cost >= 1) {
      return `$${cost.toFixed(2)}`;
    } else if (cost >= 0.001) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(decimals)}`;
    }
  }

  /**
   * 计算费用节省（使用缓存的节省）
   */
  static calculateCacheSavings(usage: Usage, model: string = 'unknown'): CacheSavings {
    const pricing = this.getModelPricing(model);
    const cacheReadTokens = usage.cache_read_input_tokens || 0;

    // 如果这些token不使用缓存，需要按正常input价格计费
    const normalCost = (cacheReadTokens / 1000000) * pricing.input;
    const cacheCost = (cacheReadTokens / 1000000) * pricing.cacheRead;
    const savings = normalCost - cacheCost;
    const savingsPercentage = normalCost > 0 ? (savings / normalCost) * 100 : 0;

    return {
      normalCost,
      cacheCost,
      savings,
      savingsPercentage,
      formatted: {
        normalCost: this.formatCost(normalCost),
        cacheCost: this.formatCost(cacheCost),
        savings: this.formatCost(savings),
        savingsPercentage: `${savingsPercentage.toFixed(1)}%`
      }
    };
  }
}

export default CostCalculator;