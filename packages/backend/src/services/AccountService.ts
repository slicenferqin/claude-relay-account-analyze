import { 
  AccountInfo, 
  AccountStatistics, 
  CostBreakdown,
  AccountGroup,
  formatDate 
} from '@account-dashboard/shared';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { CostCalculator } from '../utils/CostCalculator';

/**
 * 获取指定时区的日期字符串
 */
function getDateStringInTimezone(date: Date = new Date(), timezone: string = 'Asia/Shanghai'): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

export class AccountService {

  /**
   * 获取账户基本信息
   */
  async getAccountInfo(accountId: string): Promise<AccountInfo | null> {
    try {
      // 尝试多种可能的key格式
      const keyPatterns = [
        `claude_console_account:${accountId}`,
        `claude_account:${accountId}`,
        `claude:account:${accountId}`,
        `gemini_account:${accountId}`,
        `openai:account:${accountId}`,
        `bedrock_account:${accountId}`,
        `azure_openai:account:${accountId}`
      ];

      for (const key of keyPatterns) {
        const data = await redisClient.hgetall(key);
        
        if (Object.keys(data).length > 0) {
          return {
            id: data.id || accountId,
            name: data.name || '',
            description: data.description || '',
            email: data.email || '',
            platform: this.extractPlatformFromKey(key),
            isActive: data.isActive === 'true',
            lastUsedAt: data.lastUsedAt || '',
            lastRefreshAt: data.lastRefreshAt || '',
            status: data.status as any || 'created',
            accountType: data.accountType as any || 'dedicated',
            priority: parseInt(data.priority || '50'),
            schedulable: data.schedulable === 'true',
            autoStopOnWarning: data.autoStopOnWarning === 'true',
            proxy: data.proxy || '',
            createdAt: data.createdAt || '',
            errorMessage: data.errorMessage || '',
            apiUrl: data.apiUrl || '',
            rateLimitDuration: data.rateLimitDuration ? parseInt(data.rateLimitDuration) : undefined,
            rateLimitStatus: data.rateLimitStatus as any || '',
            rateLimitedAt: data.rateLimitedAt || ''
          };
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error getting account info for ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * 从key中提取平台信息
   */
  private extractPlatformFromKey(key: string): AccountInfo['platform'] {
    if (key.includes('claude_console')) return 'claude-console';
    if (key.includes('claude')) return 'claude';
    if (key.includes('gemini')) return 'gemini';
    if (key.includes('openai') && !key.includes('azure')) return 'openai';
    if (key.includes('bedrock')) return 'bedrock';
    if (key.includes('azure_openai')) return 'azure-openai';
    return 'claude';
  }

  /**
   * 获取账户使用统计
   */
  async getAccountUsage(accountId: string, dateStr: string): Promise<any> {
    try {
      const dailyKey = `account_usage:daily:${accountId}:${dateStr}`;
      const data = await redisClient.hgetall(dailyKey);
      
      return {
        tokens: parseInt(data.tokens || '0'),
        inputTokens: parseInt(data.inputTokens || '0'),
        outputTokens: parseInt(data.outputTokens || '0'),
        cacheCreateTokens: parseInt(data.cacheCreateTokens || '0'),
        cacheReadTokens: parseInt(data.cacheReadTokens || '0'),
        allTokens: parseInt(data.allTokens || '0'),
        requests: parseInt(data.requests || '0')
      };
    } catch (error) {
      logger.error(`Error getting account usage for ${accountId}:`, error);
      return {
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        allTokens: 0,
        requests: 0
      };
    }
  }

  /**
   * 计算账户的近期RPM
   */
  async calculateAccountRPM(accountId: string, minutes: number = 10): Promise<number> {
    try {
      const now = new Date();
      const commands: Array<[string, ...any[]]> = [];
      
      for (let i = 0; i < minutes; i++) {
        const time = new Date(now.getTime() - i * 60 * 1000);
        const dateStr = formatDate(time);
        const hour = time.getHours().toString().padStart(2, '0');
        const hourlyKey = `account_usage:hourly:${accountId}:${dateStr}:${hour}`;
        
        commands.push(['hget', hourlyKey, 'requests']);
      }
      
      const results = await redisClient.pipeline(commands);
      
      const totalRequests = results.reduce((sum, result) => {
        const requests = parseInt(result || '0');
        return sum + requests;
      }, 0);
      
      return Math.round(totalRequests / minutes);
    } catch (error) {
      logger.error(`Error calculating account RPM for ${accountId}:`, error);
      return 0;
    }
  }

  /**
   * 基于原系统逻辑的账户日费用计算
   * 根据各模型的使用数据和定价计算总费用
   */
  async getAccountDailyCost(accountId: string, dateStr?: string): Promise<number> {
    try {
      const today = dateStr || getDateStringInTimezone();

      // 获取账户今日所有模型的使用数据
      const pattern = `account_usage:model:daily:${accountId}:*:${today}`;
      const modelKeys = await redisClient.scanKeys(pattern);

      if (!modelKeys || modelKeys.length === 0) {
        logger.debug(`No model usage found for account ${accountId} on ${today}`);
        return 0;
      }

      let totalCost = 0;

      for (const key of modelKeys) {
        // 从key中解析模型名称
        // 格式：account_usage:model:daily:{accountId}:{model}:{date}
        const parts = key.split(':');
        const model = parts[4]; // 模型名在第5个位置（索引4）

        // 获取该模型的使用数据
        const modelUsage = await redisClient.hgetall(key);

        if (modelUsage && (modelUsage.inputTokens || modelUsage.outputTokens)) {
          const usage = {
            input_tokens: parseInt(modelUsage.inputTokens || '0'),
            output_tokens: parseInt(modelUsage.outputTokens || '0'),
            cache_creation_input_tokens: parseInt(modelUsage.cacheCreateTokens || '0'),
            cache_read_input_tokens: parseInt(modelUsage.cacheReadTokens || '0')
          };

          // 使用原系统的CostCalculator计算费用
          const costResult = CostCalculator.calculateCost(usage, model);
          totalCost += costResult.costs.total;

          logger.debug(
            `💰 Account ${accountId} daily cost for model ${model}: ${costResult.costs.total}`,
            { usage, cost: costResult.costs }
          );
        }
      }

      logger.debug(`💰 Account ${accountId} total daily cost: ${totalCost}`);
      return totalCost;
    } catch (error) {
      logger.error(`Error calculating account daily cost for ${accountId}:`, error);
      return 0;
    }
  }

  /**
   * 获取账户关联的API Keys并计算费用
   */
  async calculateAccountDailyCost(accountId: string, date: string): Promise<number> {
    try {
      // 优先使用基于模型使用数据的计算方式
      const modelBasedCost = await this.getAccountDailyCost(accountId, date);
      if (modelBasedCost > 0) {
        return modelBasedCost;
      }
      
      // 方案2：直接从账户的usage中获取cost
      const dailyKey = `account_usage:daily:${accountId}:${date}`;
      const costFromUsage = await redisClient.hget(dailyKey, 'cost');
      if (costFromUsage) {
        return parseFloat(costFromUsage);
      }
      
      // 方案3：通过账号下的用户聚合费用
      const userCosts = await this.calculateAccountUsersCost(accountId, date);
      if (userCosts > 0) {
        return userCosts;
      }
      
      // 方案4：从关联的API Keys累加费用（备选方案）
      const apiKeys = await this.getAccountApiKeys(accountId);
      
      const costPromises = apiKeys.map(async (keyId) => {
        // 尝试多个可能的key格式
        const costKeys = [
          `usage:cost:daily:${keyId}:${date}`,
          `usage:daily:${keyId}:${date}`,
          `apikey_usage:daily:${keyId}:${date}`
        ];
        
        for (const costKey of costKeys) {
          const costData = await redisClient.hget(costKey, 'cost');
          if (costData) {
            return parseFloat(costData);
          }
        }
        
        return 0;
      });
      
      const costs = await Promise.all(costPromises);
      return costs.reduce((sum, cost) => sum + cost, 0);
    } catch (error) {
      logger.error(`Error calculating account daily cost for ${accountId}:`, error);
      return 0;
    }
  }

  /**
   * 计算账号下所有用户的费用总和
   */
  async calculateAccountUsersCost(accountId: string, date: string): Promise<number> {
    try {
      // 获取账号下所有用户ID
      const userIds = await this.getAccountUsers(accountId);
      
      if (userIds.length === 0) {
        return 0;
      }
      
      // 计算每个用户的今日费用并求和
      const userCostPromises = userIds.map(async (userId) => {
        return await this.calculateUserDailyCost(userId, date);
      });
      
      const userCosts = await Promise.all(userCostPromises);
      const totalCost = userCosts.reduce((sum, cost) => sum + cost, 0);
      
      logger.info(`Account ${accountId} users cost calculation: ${userIds.length} users, total cost: ${totalCost}`);
      return totalCost;
    } catch (error) {
      logger.error(`Error calculating account users cost for ${accountId}:`, error);
      return 0;
    }
  }

  /**
   * 获取账号下的所有用户ID
   */
  async getAccountUsers(accountId: string): Promise<string[]> {
    try {
      const userIds = new Set<string>();
      
      // 方法1：从API Keys中获取关联用户
      const allApiKeys = await redisClient.scanKeys('apikey:*');
      
      for (const keyPath of allApiKeys) {
        const keyData = await redisClient.hgetall(keyPath);
        
        // 检查API Key是否属于该账号
        const isRelated = keyData.claudeAccountId === accountId ||
                         keyData.accountId === accountId ||
                         keyData.claudeAccountId === `group:${accountId}`;
        
        if (isRelated && keyData.userId) {
          userIds.add(keyData.userId);
        }
      }
      
      // 方法2：直接查找账号关联的用户（如果有这样的数据结构）
      const accountUsersKey = `account_users:${accountId}`;
      const accountUsers = await redisClient.smembers(accountUsersKey);
      accountUsers.forEach(userId => userIds.add(userId));
      
      const result = Array.from(userIds).filter(id => id && id.length > 0);
      logger.info(`Found ${result.length} users for account ${accountId}: ${result.slice(0, 5).join(', ')}${result.length > 5 ? '...' : ''}`);
      
      return result;
    } catch (error) {
      logger.error(`Error getting account users for ${accountId}:`, error);
      return [];
    }
  }

  /**
   * 计算单个用户的日费用
   */
  async calculateUserDailyCost(userId: string, date: string): Promise<number> {
    try {
      // 尝试多种可能的用户费用key格式
      const userCostKeys = [
        `usage:cost:daily:${userId}:${date}`,
        `user_usage:daily:${userId}:${date}`,
        `usage:daily:user:${userId}:${date}`,
        `daily_usage:${userId}:${date}`
      ];
      
      for (const costKey of userCostKeys) {
        const costData = await redisClient.hget(costKey, 'cost');
        if (costData) {
          const cost = parseFloat(costData);
          if (cost > 0) {
            logger.debug(`Found cost ${cost} for user ${userId} in key ${costKey}`);
            return cost;
          }
        }
      }
      
      return 0;
    } catch (error) {
      logger.error(`Error calculating user daily cost for ${userId}:`, error);
      return 0;
    }
  }

  /**
   * 获取账户关联的API Keys
   */
  async getAccountApiKeys(accountId: string): Promise<string[]> {
    try {
      const allApiKeys = await redisClient.scanKeys('apikey:*');
      const relatedKeys: string[] = [];
      
      for (const keyPath of allApiKeys) {
        const keyId = keyPath.replace('apikey:', '');
        
        // 获取API Key的所有数据
        const keyData = await redisClient.hgetall(keyPath);
        
        // 多种匹配方式
        // 1. claudeAccountId直接匹配
        if (keyData.claudeAccountId === accountId) {
          relatedKeys.push(keyId);
          continue;
        }
        
        // 2. 通过组匹配
        if (keyData.claudeAccountId === `group:${accountId}`) {
          relatedKeys.push(keyId);
          continue;
        }
        
        // 3. 通过accountId字段匹配
        if (keyData.accountId === accountId) {
          relatedKeys.push(keyId);
          continue;
        }
        
        // 4. 名称包含账户ID
        if (keyData.name && keyData.name.includes(accountId)) {
          relatedKeys.push(keyId);
          continue;
        }
      }
      
      return relatedKeys;
    } catch (error) {
      logger.error(`Error getting account API keys for ${accountId}:`, error);
      return [];
    }
  }

  /**
   * 获取账户所属分组
   */
  async getAccountGroup(accountId: string): Promise<{ id: string; name: string; totalMembers: number; activeMembers: number } | undefined> {
    try {
      const allGroups = await redisClient.smembers('account_groups');
      
      for (const groupId of allGroups) {
        const members = await redisClient.smembers(`account_group_members:${groupId}`);
        
        if (members.includes(accountId)) {
          const groupInfo = await redisClient.hgetall(`account_group:${groupId}`);
          const activeMembers = await this.countActiveGroupMembers(members);
          
          return {
            id: groupId,
            name: groupInfo.name || '',
            totalMembers: members.length,
            activeMembers
          };
        }
      }
      
      return undefined;
    } catch (error) {
      logger.error(`Error getting account group for ${accountId}:`, error);
      return undefined;
    }
  }

  /**
   * 计算分组中的活跃成员数（近10分钟有活动）
   */
  private async countActiveGroupMembers(memberIds: string[]): Promise<number> {
    try {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;
      let activeCount = 0;
      
      const promises = memberIds.map(async (memberId) => {
        const account = await this.getAccountInfo(memberId);
        if (account && account.lastUsedAt) {
          const lastUsed = new Date(account.lastUsedAt).getTime();
          return lastUsed > tenMinutesAgo;
        }
        return false;
      });
      
      const results = await Promise.all(promises);
      return results.filter(Boolean).length;
    } catch (error) {
      logger.error('Error counting active group members:', error);
      return 0;
    }
  }

  /**
   * 获取完整的账户统计信息
   */
  async getAccountStatistics(accountId: string): Promise<AccountStatistics | null> {
    try {
      const today = formatDate(new Date());
      
      const [info, todayUsage, recentRpm, todayCost, group] = await Promise.all([
        this.getAccountInfo(accountId),
        this.getAccountUsage(accountId, today),
        this.calculateAccountRPM(accountId, 10),
        this.calculateAccountDailyCost(accountId, today),
        this.getAccountGroup(accountId)
      ]);

      if (!info) {
        return null;
      }

      // 获取24小时的小时级数据
      const hourlyData = await this.getAccountHourlyData(accountId, today);

      return {
        accountId,
        accountName: info.name,
        platform: info.platform,
        isActive: info.isActive,
        status: info.status,
        todayTokenUsage: todayUsage.allTokens,
        todayExpense: todayCost,
        recentAvgRpm: recentRpm,
        lastUsedAt: info.lastUsedAt,
        group,
        usage: {
          today: {
            requests: todayUsage.requests,
            inputTokens: todayUsage.inputTokens,
            outputTokens: todayUsage.outputTokens,
            totalTokens: todayUsage.allTokens,
            cost: todayCost
          },
          hourly: hourlyData,
          models: {} // 可以后续扩展模型级别的统计
        }
      };
    } catch (error) {
      logger.error(`Error getting account statistics for ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * 获取账户的小时级数据
   */
  private async getAccountHourlyData(accountId: string, dateStr: string): Promise<Array<{ hour: string; requests: number; tokens: number; cost: number }>> {
    try {
      const hourlyData: Array<{ hour: string; requests: number; tokens: number; cost: number }> = [];
      
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        const hourlyKey = `account_usage:hourly:${accountId}:${dateStr}:${hourStr}`;
        
        const data = await redisClient.hgetall(hourlyKey);
        
        hourlyData.push({
          hour: `${hourStr}:00`,
          requests: parseInt(data.requests || '0'),
          tokens: parseInt(data.allTokens || data.tokens || '0'),
          cost: 0 // 小时级费用数据需要从关联的API Keys计算
        });
      }
      
      return hourlyData;
    } catch (error) {
      logger.error(`Error getting account hourly data for ${accountId}:`, error);
      return [];
    }
  }

  /**
   * 获取所有账户列表
   */
  async getAllAccounts(): Promise<string[]> {
    try {
      const patterns = [
        'claude_console_account:*',
        'claude_account:*',
        'claude:account:*',
        'gemini_account:*',
        'openai:account:*',
        'bedrock_account:*',
        'azure_openai:account:*'
      ];

      const allAccountKeys: string[] = [];
      
      for (const pattern of patterns) {
        const keys = await redisClient.scanKeys(pattern);
        allAccountKeys.push(...keys);
      }
      
      // 提取账户ID
      return allAccountKeys.map(key => {
        const parts = key.split(':');
        return parts[parts.length - 1];
      });
    } catch (error) {
      logger.error('Error getting all accounts:', error);
      throw error;
    }
  }

  /**
   * 获取多个账户的统计信息
   */
  async getMultipleAccountStatistics(accountIds: string[]): Promise<AccountStatistics[]> {
    try {
      const results = await Promise.allSettled(
        accountIds.map(accountId => this.getAccountStatistics(accountId))
      );

      return results
        .filter((result): result is PromiseFulfilledResult<AccountStatistics | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value!);
    } catch (error) {
      logger.error('Error getting multiple account statistics:', error);
      throw error;
    }
  }

  /**
   * 获取所有分组信息
   */
  async getAllGroups(): Promise<AccountGroup[]> {
    try {
      const groupIds = await redisClient.smembers('account_groups');
      const groups: AccountGroup[] = [];
      
      for (const groupId of groupIds) {
        const groupData = await redisClient.hgetall(`account_group:${groupId}`);
        const members = await redisClient.smembers(`account_group_members:${groupId}`);
        
        if (Object.keys(groupData).length > 0) {
          groups.push({
            id: groupId,
            name: groupData.name || '',
            platform: groupData.platform || '',
            description: groupData.description || '',
            memberCount: members.length,
            members,
            createdAt: groupData.createdAt || '',
            updatedAt: groupData.updatedAt || ''
          });
        }
      }
      
      return groups;
    } catch (error) {
      logger.error('Error getting all groups:', error);
      throw error;
    }
  }
}