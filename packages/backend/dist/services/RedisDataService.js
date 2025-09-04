"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisDataService = void 0;
const shared_1 = require("@account-dashboard/shared");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
class RedisDataService {
    /**
     * 获取API Key基本信息
     */
    async getApiKeyInfo(keyId) {
        try {
            const data = await redis_1.redisClient.hgetall(`apikey:${keyId}`);
            if (Object.keys(data).length === 0) {
                return null;
            }
            return {
                id: data.id || keyId,
                name: data.name || '',
                description: data.description || '',
                isActive: data.isActive === 'true',
                claudeAccountId: data.claudeAccountId || '',
                permissions: data.permissions || 'all',
                dailyCostLimit: data.dailyCostLimit ? parseFloat(data.dailyCostLimit) : undefined,
                tags: data.tags ? JSON.parse(data.tags) : [],
                createdAt: data.createdAt || '',
                lastUsedAt: data.lastUsedAt || '',
                expiresAt: data.expiresAt || '',
                createdBy: data.createdBy || '',
                userId: data.userId || '',
                userUsername: data.userUsername || ''
            };
        }
        catch (error) {
            logger_1.logger.error(`Error getting API key info for ${keyId}:`, error);
            throw error;
        }
    }
    /**
     * 获取API Key使用统计数据
     */
    async getApiKeyUsage(keyId, timeRange) {
        try {
            let dateStr;
            if (timeRange === 'today') {
                dateStr = (0, shared_1.formatDate)(new Date());
            }
            else if (timeRange === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dateStr = (0, shared_1.formatDate)(yesterday);
            }
            else {
                dateStr = timeRange;
            }
            // 获取日使用量数据
            const dailyKey = `usage:daily:${keyId}:${dateStr}`;
            const dailyData = await redis_1.redisClient.hgetall(dailyKey);
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
        }
        catch (error) {
            logger_1.logger.error(`Error getting API key usage for ${keyId}:`, error);
            throw error;
        }
    }
    /**
     * 计算API Key的RPM（每分钟请求数）
     */
    async calculateRPM(keyId, minutes = 10) {
        try {
            const now = new Date();
            const commands = [];
            // 构建最近N分钟的查询命令
            for (let i = 0; i < minutes; i++) {
                const time = new Date(now.getTime() - i * 60 * 1000);
                const dateStr = (0, shared_1.formatDate)(time);
                const hour = time.getHours().toString().padStart(2, '0');
                const hourlyKey = `usage:hourly:${keyId}:${dateStr}:${hour}`;
                commands.push(['hget', hourlyKey, 'requests']);
            }
            const results = await redis_1.redisClient.pipeline(commands);
            const totalRequests = results.reduce((sum, result) => {
                const requests = parseInt(result || '0');
                return sum + requests;
            }, 0);
            return Math.round(totalRequests / minutes);
        }
        catch (error) {
            logger_1.logger.error(`Error calculating RPM for ${keyId}:`, error);
            return 0;
        }
    }
    /**
     * 获取API Key的费用信息
     */
    async getApiKeyCost(keyId, dateStr) {
        try {
            const costKey = `usage:cost:daily:${keyId}:${dateStr}`;
            const cost = await redis_1.redisClient.get(costKey);
            return parseFloat(cost || '0');
        }
        catch (error) {
            logger_1.logger.error(`Error getting API key cost for ${keyId}:`, error);
            return 0;
        }
    }
    /**
     * 获取分组信息
     */
    async getGroupInfo(groupId) {
        try {
            const groupData = await redis_1.redisClient.hgetall(`account_group:${groupId}`);
            if (Object.keys(groupData).length === 0) {
                return null;
            }
            return {
                id: groupId,
                name: groupData.name || ''
            };
        }
        catch (error) {
            logger_1.logger.error(`Error getting group info for ${groupId}:`, error);
            return null;
        }
    }
    /**
     * 获取所有API Key列表
     */
    async getAllApiKeys() {
        try {
            const keys = await redis_1.redisClient.scanKeys('apikey:*');
            return keys.map(key => key.replace('apikey:', ''));
        }
        catch (error) {
            logger_1.logger.error('Error getting all API keys:', error);
            throw error;
        }
    }
    /**
     * 获取完整的API Key统计信息
     */
    async getApiKeyStatistics(keyId) {
        try {
            const [info, todayUsage, rpm, todayCost] = await Promise.all([
                this.getApiKeyInfo(keyId),
                this.getApiKeyUsage(keyId, 'today'),
                this.calculateRPM(keyId, 10),
                this.getApiKeyCost(keyId, (0, shared_1.formatDate)(new Date()))
            ]);
            if (!info) {
                return null;
            }
            // 获取分组信息（如果API Key关联了分组）
            let currentGroup;
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
        }
        catch (error) {
            logger_1.logger.error(`Error getting API key statistics for ${keyId}:`, error);
            throw error;
        }
    }
    /**
     * 计算最近N分钟的总请求数
     */
    async calculateRecentRequests(keyId, minutes) {
        try {
            const now = new Date();
            const commands = [];
            for (let i = 0; i < minutes; i++) {
                const time = new Date(now.getTime() - i * 60 * 1000);
                const dateStr = (0, shared_1.formatDate)(time);
                const hour = time.getHours().toString().padStart(2, '0');
                const hourlyKey = `usage:hourly:${keyId}:${dateStr}:${hour}`;
                commands.push(['hget', hourlyKey, 'requests']);
            }
            const results = await redis_1.redisClient.pipeline(commands);
            return results.reduce((sum, result) => {
                const requests = parseInt(result || '0');
                return sum + requests;
            }, 0);
        }
        catch (error) {
            logger_1.logger.error(`Error calculating recent requests for ${keyId}:`, error);
            return 0;
        }
    }
    /**
     * 获取多个API Key的统计信息
     */
    async getMultipleApiKeyStatistics(keyIds) {
        try {
            const results = await Promise.allSettled(keyIds.map(keyId => this.getApiKeyStatistics(keyId)));
            return results
                .filter((result) => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);
        }
        catch (error) {
            logger_1.logger.error('Error getting multiple API key statistics:', error);
            throw error;
        }
    }
    /**
     * 获取系统分钟级指标
     */
    async getSystemMetrics(timestamp) {
        try {
            const ts = timestamp || Math.floor(Date.now() / 60000); // 分钟级时间戳
            const key = `system:metrics:minute:${ts}`;
            const data = await redis_1.redisClient.hgetall(key);
            return {
                timestamp: new Date(ts * 60000).toISOString(),
                requests: parseInt(data.requests || '0'),
                totalTokens: parseInt(data.totalTokens || '0'),
                inputTokens: parseInt(data.inputTokens || '0'),
                outputTokens: parseInt(data.outputTokens || '0'),
                cacheCreateTokens: parseInt(data.cacheCreateTokens || '0'),
                cacheReadTokens: parseInt(data.cacheReadTokens || '0')
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting system metrics:', error);
            throw error;
        }
    }
    /**
     * 健康检查
     */
    async healthCheck() {
        return await redis_1.redisClient.healthCheck();
    }
    /**
     * 获取集合成员
     */
    async smembers(key) {
        return await redis_1.redisClient.smembers(key);
    }
}
exports.RedisDataService = RedisDataService;
//# sourceMappingURL=RedisDataService.js.map