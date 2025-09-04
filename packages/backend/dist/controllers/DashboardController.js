"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const RedisDataService_1 = require("../services/RedisDataService");
const AccountService_1 = require("../services/AccountService");
const logger_1 = require("../utils/logger");
class DashboardController {
    constructor() {
        this.redisDataService = new RedisDataService_1.RedisDataService();
        this.accountService = new AccountService_1.AccountService();
    }
    /**
     * 获取所有API Key统计信息
     */
    async getApiKeys(req, res) {
        try {
            const query = req.query;
            // 获取所有API Keys
            let keyIds = await this.redisDataService.getAllApiKeys();
            // 应用过滤条件
            if (query.groupId || query.isActive !== undefined) {
                keyIds = await this.filterApiKeys(keyIds, query);
            }
            // 应用搜索
            if (query.search) {
                keyIds = await this.searchApiKeys(keyIds, query.search);
            }
            // 应用分页
            const page = parseInt(query.page?.toString() || '1');
            const limit = parseInt(query.limit?.toString() || '20');
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedKeyIds = keyIds.slice(startIndex, endIndex);
            // 获取统计信息
            const statistics = await this.redisDataService.getMultipleApiKeyStatistics(paginatedKeyIds);
            // 应用排序
            if (query.sort) {
                this.sortApiKeyStatistics(statistics, query.sort, query.order || 'desc');
            }
            const response = {
                success: true,
                data: statistics,
                timestamp: new Date().toISOString()
            };
            if (query.page && query.limit) {
                response.pagination = {
                    page,
                    limit,
                    total: keyIds.length,
                    totalPages: Math.ceil(keyIds.length / limit)
                };
            }
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Error in getApiKeys:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取单个API Key统计信息
     */
    async getApiKey(req, res) {
        try {
            const { id } = req.params;
            const statistics = await this.redisDataService.getApiKeyStatistics(id);
            if (!statistics) {
                res.status(404).json({
                    success: false,
                    error: 'API Key not found',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            const response = {
                success: true,
                data: statistics,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Error in getApiKey for ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取API Key使用趋势
     */
    async getApiKeyUsage(req, res) {
        try {
            const { id } = req.params;
            const { startDate, endDate, granularity = 'hourly' } = req.query;
            // 这里可以实现不同时间粒度的使用数据获取
            // 暂时返回今日数据
            const usage = await this.redisDataService.getApiKeyUsage(id, 'today');
            const response = {
                success: true,
                data: usage,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Error in getApiKeyUsage for ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取所有账户统计信息
     */
    async getAccounts(req, res) {
        try {
            const query = req.query;
            // 获取所有账户
            let accountIds = await this.accountService.getAllAccounts();
            // 应用过滤条件
            if (query.platform || query.groupId || query.status) {
                accountIds = await this.filterAccounts(accountIds, query);
            }
            // 应用搜索
            if (query.search) {
                accountIds = await this.searchAccounts(accountIds, query.search);
            }
            // 应用分页
            const page = parseInt(query.page?.toString() || '1');
            const limit = parseInt(query.limit?.toString() || '20');
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedAccountIds = accountIds.slice(startIndex, endIndex);
            // 获取统计信息
            const statistics = await this.accountService.getMultipleAccountStatistics(paginatedAccountIds);
            // 应用排序
            if (query.sort) {
                this.sortAccountStatistics(statistics, query.sort, query.order || 'desc');
            }
            const response = {
                success: true,
                data: statistics,
                timestamp: new Date().toISOString()
            };
            if (query.page && query.limit) {
                response.pagination = {
                    page,
                    limit,
                    total: accountIds.length,
                    totalPages: Math.ceil(accountIds.length / limit)
                };
            }
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Error in getAccounts:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取单个账户统计信息
     */
    async getAccount(req, res) {
        try {
            const { id } = req.params;
            const statistics = await this.accountService.getAccountStatistics(id);
            if (!statistics) {
                res.status(404).json({
                    success: false,
                    error: 'Account not found',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            const response = {
                success: true,
                data: statistics,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Error in getAccount for ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取账户费用明细
     */
    async getAccountCost(req, res) {
        try {
            const { id } = req.params;
            const { date } = req.query;
            const dateStr = date || new Date().toISOString().split('T')[0];
            const cost = await this.accountService.calculateAccountDailyCost(id, dateStr);
            const response = {
                success: true,
                data: {
                    accountId: id,
                    date: dateStr,
                    totalCost: cost,
                    breakdown: [] // 可以扩展为详细的费用明细
                },
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Error in getAccountCost for ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取所有分组信息
     */
    async getGroups(req, res) {
        try {
            const groups = await this.accountService.getAllGroups();
            const response = {
                success: true,
                data: groups,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Error in getGroups:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取分组成员信息
     */
    async getGroupMembers(req, res) {
        try {
            const { id } = req.params;
            // 获取分组成员账户信息
            const members = await this.redisDataService.smembers(`account_group_members:${id}`);
            const accounts = await this.accountService.getMultipleAccountStatistics(members);
            // 获取分组相关的API Keys
            const apiKeys = await this.getGroupApiKeys(id);
            const response = {
                success: true,
                data: {
                    accounts,
                    apiKeys
                },
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Error in getGroupMembers for ${req.params.id}:`, error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取实时系统指标
     */
    async getSystemMetrics(req, res) {
        try {
            const metrics = await this.redisDataService.getSystemMetrics();
            const response = {
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Error in getSystemMetrics:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 健康检查端点
     */
    async healthCheck(req, res) {
        try {
            const redisHealth = await this.redisDataService.healthCheck();
            const health = {
                status: redisHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                services: {
                    redis: redisHealth
                }
            };
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        }
        catch (error) {
            logger_1.logger.error('Error in healthCheck:', error);
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // 私有辅助方法
    async filterApiKeys(keyIds, query) {
        const filtered = [];
        for (const keyId of keyIds) {
            const info = await this.redisDataService.getApiKeyInfo(keyId);
            if (!info)
                continue;
            if (query.isActive !== undefined && info.isActive !== query.isActive)
                continue;
            if (query.groupId && !info.claudeAccountId?.includes(query.groupId))
                continue;
            filtered.push(keyId);
        }
        return filtered;
    }
    async searchApiKeys(keyIds, search) {
        const searchTerm = search.toLowerCase();
        const filtered = [];
        for (const keyId of keyIds) {
            const info = await this.redisDataService.getApiKeyInfo(keyId);
            if (!info)
                continue;
            if (info.name.toLowerCase().includes(searchTerm) ||
                info.description?.toLowerCase().includes(searchTerm) ||
                keyId.toLowerCase().includes(searchTerm)) {
                filtered.push(keyId);
            }
        }
        return filtered;
    }
    sortApiKeyStatistics(statistics, sort, order) {
        statistics.sort((a, b) => {
            let aVal = a[sort];
            let bVal = b[sort];
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }
    async filterAccounts(accountIds, query) {
        const filtered = [];
        for (const accountId of accountIds) {
            const info = await this.accountService.getAccountInfo(accountId);
            if (!info)
                continue;
            if (query.platform && info.platform !== query.platform)
                continue;
            if (query.status && info.status !== query.status)
                continue;
            filtered.push(accountId);
        }
        return filtered;
    }
    async searchAccounts(accountIds, search) {
        const searchTerm = search.toLowerCase();
        const filtered = [];
        for (const accountId of accountIds) {
            const info = await this.accountService.getAccountInfo(accountId);
            if (!info)
                continue;
            if (info.name.toLowerCase().includes(searchTerm) ||
                accountId.toLowerCase().includes(searchTerm)) {
                filtered.push(accountId);
            }
        }
        return filtered;
    }
    sortAccountStatistics(statistics, sort, order) {
        statistics.sort((a, b) => {
            let aVal = a[sort];
            let bVal = b[sort];
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }
    async getGroupApiKeys(groupId) {
        try {
            const allApiKeys = await this.redisDataService.getAllApiKeys();
            const groupApiKeys = [];
            for (const keyId of allApiKeys) {
                const info = await this.redisDataService.getApiKeyInfo(keyId);
                if (info?.claudeAccountId === `group:${groupId}`) {
                    const stats = await this.redisDataService.getApiKeyStatistics(keyId);
                    if (stats) {
                        groupApiKeys.push(stats);
                    }
                }
            }
            return groupApiKeys;
        }
        catch (error) {
            logger_1.logger.error(`Error getting group API keys for ${groupId}:`, error);
            return [];
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map