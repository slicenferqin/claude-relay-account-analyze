import { logger } from './logger';

/**
 * 获取指定时区的日期字符串
 * @param date 日期对象，默认为当前时间
 * @param timezone 时区，默认为UTC+8
 * @returns YYYY-MM-DD格式的日期字符串
 */
export function getDateStringInTimezone(date: Date = new Date(), timezone: string = 'Asia/Shanghai'): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA格式为YYYY-MM-DD
}

/**
 * 费用计算器
 * 根据不同模型的token使用量计算费用
 */
export class CostCalculator {
  
  // 模型定价表（每千个token的价格）
  private static MODEL_PRICING: Record<string, {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  }> = {
    // Claude模型
    'claude-3-5-sonnet-20241022': {
      input_tokens: 0.003,  // $3 per million tokens
      output_tokens: 0.015, // $15 per million tokens
      cache_creation_input_tokens: 0.00375, // $3.75 per million tokens
      cache_read_input_tokens: 0.0003 // $0.3 per million tokens
    },
    'claude-3-5-sonnet-20240620': {
      input_tokens: 0.003,
      output_tokens: 0.015,
      cache_creation_input_tokens: 0.00375,
      cache_read_input_tokens: 0.0003
    },
    'claude-3-5-haiku-20241022': {
      input_tokens: 0.001,  // $1 per million tokens
      output_tokens: 0.005, // $5 per million tokens
      cache_creation_input_tokens: 0.00125,
      cache_read_input_tokens: 0.0001
    },
    'claude-3-opus-20240229': {
      input_tokens: 0.015,  // $15 per million tokens
      output_tokens: 0.075, // $75 per million tokens
      cache_creation_input_tokens: 0.01875,
      cache_read_input_tokens: 0.0015
    },
    'claude-3-sonnet-20240229': {
      input_tokens: 0.003,  // $3 per million tokens
      output_tokens: 0.015, // $15 per million tokens
      cache_creation_input_tokens: 0.00375,
      cache_read_input_tokens: 0.0003
    },
    'claude-3-haiku-20240307': {
      input_tokens: 0.00025, // $0.25 per million tokens
      output_tokens: 0.00125, // $1.25 per million tokens
      cache_creation_input_tokens: 0.0003,
      cache_read_input_tokens: 0.000025
    },
    // OpenAI模型
    'gpt-4o': {
      input_tokens: 0.005,  // $5 per million tokens
      output_tokens: 0.015, // $15 per million tokens
      cache_creation_input_tokens: 0.005,
      cache_read_input_tokens: 0.005
    },
    'gpt-4o-mini': {
      input_tokens: 0.00015, // $0.15 per million tokens
      output_tokens: 0.0006,  // $0.6 per million tokens
      cache_creation_input_tokens: 0.00015,
      cache_read_input_tokens: 0.00015
    },
    'gpt-4-turbo': {
      input_tokens: 0.01,   // $10 per million tokens
      output_tokens: 0.03,  // $30 per million tokens
      cache_creation_input_tokens: 0.01,
      cache_read_input_tokens: 0.01
    },
    'gpt-3.5-turbo': {
      input_tokens: 0.0005,  // $0.5 per million tokens
      output_tokens: 0.0015, // $1.5 per million tokens
      cache_creation_input_tokens: 0.0005,
      cache_read_input_tokens: 0.0005
    },
    // Gemini模型
    'gemini-1.5-pro': {
      input_tokens: 0.00125, // $1.25 per million tokens
      output_tokens: 0.005,  // $5 per million tokens
      cache_creation_input_tokens: 0.00125,
      cache_read_input_tokens: 0.00125
    },
    'gemini-1.5-flash': {
      input_tokens: 0.00075, // $0.075 per million tokens
      output_tokens: 0.0003,  // $0.3 per million tokens
      cache_creation_input_tokens: 0.00075,
      cache_read_input_tokens: 0.00075
    },
    // 默认定价（当模型不在列表中时使用）
    'default': {
      input_tokens: 0.001,
      output_tokens: 0.002,
      cache_creation_input_tokens: 0.001,
      cache_read_input_tokens: 0.0001
    }
  };

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
  } {
    try {
      // 获取模型定价，如果不存在则使用默认定价
      const pricing = this.MODEL_PRICING[model] || this.MODEL_PRICING['default'];
      
      // 计算各项费用（转换为每千token计费）
      const inputCost = (usage.input_tokens / 1000) * pricing.input_tokens;
      const outputCost = (usage.output_tokens / 1000) * pricing.output_tokens;
      const cacheCreateCost = (usage.cache_creation_input_tokens / 1000) * pricing.cache_creation_input_tokens;
      const cacheReadCost = (usage.cache_read_input_tokens / 1000) * pricing.cache_read_input_tokens;
      
      const totalCost = inputCost + outputCost + cacheCreateCost + cacheReadCost;
      
      const result = {
        costs: {
          input: inputCost,
          output: outputCost,
          cache_create: cacheCreateCost,
          cache_read: cacheReadCost,
          total: totalCost
        },
        pricing,
        model
      };
      
      logger.debug(`Cost calculation for ${model}:`, {
        usage,
        result: result.costs
      });
      
      return result;
    } catch (error) {
      logger.error(`Error calculating cost for model ${model}:`, error);
      return {
        costs: {
          input: 0,
          output: 0,
          cache_create: 0,
          cache_read: 0,
          total: 0
        },
        pricing: this.MODEL_PRICING['default'],
        model
      };
    }
  }

  /**
   * 获取所有支持的模型列表
   */
  static getSupportedModels(): string[] {
    return Object.keys(this.MODEL_PRICING).filter(model => model !== 'default');
  }

  /**
   * 获取模型的定价信息
   */
  static getModelPricing(model: string): any {
    return this.MODEL_PRICING[model] || this.MODEL_PRICING['default'];
  }

  /**
   * 添加或更新模型定价
   */
  static updateModelPricing(model: string, pricing: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  }): void {
    this.MODEL_PRICING[model] = pricing;
    logger.info(`Updated pricing for model ${model}`, pricing);
  }
}