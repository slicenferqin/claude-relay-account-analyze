import { 
  ApiKeyInfo, 
  ApiKeyStatistics, 
  UsageData, 
  formatDate 
} from '@account-dashboard/shared';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export class RedisDataService {
  
  /**
   * 获取API Key基本信息
   */
  async getApiKeyInfo(keyId: string): Promise<ApiKeyInfo | null> {
    try {
      const data = await redisClient.hgetall(`apikey:${keyId}`);
      
      if (Object.keys(data).length === 0) {
        return null;
      }

      return {
        id: data.id || keyId,
        name: data.name || '',
        description: data.description || '',
        isActive: data.isActive === 'true',
        claudeAccountId: data.claudeAccountId || '',
        permissions: data.permissions as any || 'all',
        dailyCostLimit: data.dailyCostLimit ? parseFloat(data.dailyCostLimit) : undefined,
        tags: data.tags ? JSON.parse(data.tags) : [],
        createdAt: data.createdAt || '',
        lastUsedAt: data.lastUsedAt || '',
        expiresAt: data.expiresAt || '',
        createdBy: data.createdBy || '',
        userId: data.userId || '',
        userUsername: data.userUsername || ''
      };
    } catch (error) {
      logger.error(`Error getting API key info for ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 获取API Key使用统计数据
   */
  async getApiKeyUsage(keyId: string, timeRange: 'today' | 'yesterday' | string): Promise<UsageData> {
    try {
      let dateStr: string;
      
      if (timeRange === 'today') {
        dateStr = formatDate(new Date());
      } else if (timeRange === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateStr = formatDate(yesterday);
      } else {
        dateStr = timeRange;
      }

      // 获取日使用量数据
      const dailyKey = `usage:daily:${keyId}:${dateStr}`;
      const dailyData = await redisClient.hgetall(dailyKey);

      return {
        tokens: parseInt(dailyData.tokens || '0'),
        inputTokens: parseInt(dailyData.inputTokens || '0'),
        outputTokens: parseInt(dailyData.outputTokens || '0'),
        cacheCreateTokens: parseInt(dailyData.cacheCreateTokens || '0'),
        cacheReadTokens: parseInt(dailyData.cacheReadTokens || '0'),
        allTokens: parseInt(dailyData.allTokens || '0'),
        requests: parseInt(dailyData.requests || '0'),
        ephemeral5mTokens: parseInt(dailyData.ephemeral5mTokens || '0'),
        ephemeral1hTokens: parseInt(dailyData.ephemeral1hTokens || '0'),
        longContextInputTokens: parseInt(dailyData.longContextInputTokens || '0'),
        longContextOutputTokens: parseInt(dailyData.longContextOutputTokens || '0'),
        longContextRequests: parseInt(dailyData.longContextRequests || '0')
      };
    } catch (error) {
      logger.error(`Error getting API key usage for ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 计算API Key的RPM（每分钟请求数）
   */
  async calculateRPM(keyId: string, minutes: number = 10): Promise<number> {
    try {
      const now = new Date();
      const commands: Array<[string, ...any[]]> = [];
      
      // 构建最近N分钟的查询命令
      for (let i = 0; i < minutes; i++) {
        const time = new Date(now.getTime() - i * 60 * 1000);
        const dateStr = formatDate(time);
        const hour = time.getHours().toString().padStart(2, '0');
        const hourlyKey = `usage:hourly:${keyId}:${dateStr}:${hour}`;
        
        commands.push(['hget', hourlyKey, 'requests']);
      }
      
      const results = await redisClient.pipeline(commands);
      
      const totalRequests = results.reduce((sum, result) => {
        const requests = parseInt(result || '0');
        return sum + requests;
      }, 0);
      
      return Math.round(totalRequests / minutes);
    } catch (error) {
      logger.error(`Error calculating RPM for ${keyId}:`, error);
      return 0;
    }
  }

  /**
   * 获取API Key的费用信息
   */
  async getApiKeyCost(keyId: string, dateStr: string): Promise<number> {
    try {
      const costKey = `usage:cost:daily:${keyId}:${dateStr}`;
      const cost = await redisClient.get(costKey);
      return parseFloat(cost || '0');
    } catch (error) {
      logger.error(`Error getting API key cost for ${keyId}:`, error);
      return 0;
    }
  }

  /**
   * 获取分组信息
   */
  async getGroupInfo(groupId: string): Promise<{ id: string; name: string } | null> {
    try {
      const groupData = await redisClient.hgetall(`account_group:${groupId}`);
      
      if (Object.keys(groupData).length === 0) {
        return null;
      }
      
      return {
        id: groupId,
        name: groupData.name || ''
      };
    } catch (error) {
      logger.error(`Error getting group info for ${groupId}:`, error);
      return null;
    }
  }

  /**
   * 获取所有API Key列表
   */
  async getAllApiKeys(): Promise<string[]> {
    try {
      const keys = await redisClient.scanKeys('apikey:*');
      return keys.map(key => key.replace('apikey:', ''));
    } catch (error) {
      logger.error('Error getting all API keys:', error);
      throw error;
    }
  }

  /**
   * 获取完整的API Key统计信息
   */
  async getApiKeyStatistics(keyId: string): Promise<ApiKeyStatistics | null> {
    try {
      const [info, todayUsage, rpm, todayCost] = await Promise.all([
        this.getApiKeyInfo(keyId),
        this.getApiKeyUsage(keyId, 'today'),
        this.calculateRPM(keyId, 10),
        this.getApiKeyCost(keyId, formatDate(new Date()))
      ]);

      if (!info) {
        return null;
      }

      // 获取分组信息（如果API Key关联了分组）
      let currentGroup: { id: string; name: string; } | undefined;
      if (info.claudeAccountId && info.claudeAccountId.startsWith('group:')) {
        const groupId = info.claudeAccountId.replace('group:', '');
        const groupInfo = await this.getGroupInfo(groupId);
        currentGroup = groupInfo || undefined;
      }

      // 计算最近10分钟的请求统计
      const recentRequests = await this.calculateRecentRequests(keyId, 10);

      return {
        keyId,
        name: info.name,
        description: info.description,
        lastUsedAt: info.lastUsedAt,
        rpm,
        isActive: info.isActive,
        currentGroup,
        usage: {
          today: {
            requests: todayUsage.requests,
            inputTokens: todayUsage.inputTokens,
            outputTokens: todayUsage.outputTokens,
            totalTokens: todayUsage.allTokens,
            cost: todayCost
          },
          last10Minutes: {
            avgRpm: rpm,
            totalRequests: recentRequests
          }
        },
        limits: {
          dailyCostLimit: info.dailyCostLimit
        },
        tags: info.tags
      };
    } catch (error) {
      logger.error(`Error getting API key statistics for ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 计算最近N分钟的总请求数
   */
  private async calculateRecentRequests(keyId: string, minutes: number): Promise<number> {
    try {
      const now = new Date();
      const commands: Array<[string, ...any[]]> = [];
      
      for (let i = 0; i < minutes; i++) {
        const time = new Date(now.getTime() - i * 60 * 1000);
        const dateStr = formatDate(time);
        const hour = time.getHours().toString().padStart(2, '0');
        const hourlyKey = `usage:hourly:${keyId}:${dateStr}:${hour}`;
        
        commands.push(['hget', hourlyKey, 'requests']);
      }
      
      const results = await redisClient.pipeline(commands);
      
      return results.reduce((sum, result) => {
        const requests = parseInt(result || '0');
        return sum + requests;
      }, 0);
    } catch (error) {
      logger.error(`Error calculating recent requests for ${keyId}:`, error);
      return 0;
    }
  }

  /**
   * 获取多个API Key的统计信息
   */
  async getMultipleApiKeyStatistics(keyIds: string[]): Promise<ApiKeyStatistics[]> {
    try {
      const results = await Promise.allSettled(
        keyIds.map(keyId => this.getApiKeyStatistics(keyId))
      );

      return results
        .filter((result): result is PromiseFulfilledResult<ApiKeyStatistics | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value!);
    } catch (error) {
      logger.error('Error getting multiple API key statistics:', error);
      throw error;
    }
  }

  /**
   * 获取系统分钟级指标
   */
  async getSystemMetrics(timestamp?: number): Promise<any> {
    try {
      const ts = timestamp || Math.floor(Date.now() / 60000); // 分钟级时间戳
      const key = `system:metrics:minute:${ts}`;
      const data = await redisClient.hgetall(key);
      
      return {
        timestamp: new Date(ts * 60000).toISOString(),
        requests: parseInt(data.requests || '0'),
        totalTokens: parseInt(data.totalTokens || '0'),
        inputTokens: parseInt(data.inputTokens || '0'),
        outputTokens: parseInt(data.outputTokens || '0'),
        cacheCreateTokens: parseInt(data.cacheCreateTokens || '0'),
        cacheReadTokens: parseInt(data.cacheReadTokens || '0')
      };
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    return await redisClient.healthCheck();
  }

  /**
   * 获取集合成员
   */
  async smembers(key: string): Promise<string[]> {
    return await redisClient.smembers(key);
  }
}