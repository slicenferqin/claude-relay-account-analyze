"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const socket_io_1 = require("socket.io");
const RedisDataService_1 = require("../services/RedisDataService");
const AccountService_1 = require("../services/AccountService");
const logger_1 = require("../utils/logger");
class RealtimeService {
    constructor(httpServer) {
        this.subscribers = new Map(); // 订阅关系管理
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.redisDataService = new RedisDataService_1.RedisDataService();
        this.accountService = new AccountService_1.AccountService();
        this.setupSocketHandlers();
        this.startSystemMetricsPolling();
        this.subscribeToRedisChanges();
    }
    /**
     * 设置Socket连接处理器
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Client connected: ${socket.id}`);
            // 发送连接成功消息
            socket.emit('connected', {
                message: 'Connected to dashboard real-time service',
                timestamp: new Date().toISOString()
            });
            // API Key订阅
            socket.on('subscribe:apikey', async (data) => {
                try {
                    socket.join(`apikey:${data.keyId}`);
                    this.addSubscriber('apikey', data.keyId, socket.id);
                    // 立即发送初始数据
                    await this.sendInitialApiKeyData(socket, data.keyId);
                    logger_1.logger.info(`Client ${socket.id} subscribed to API key: ${data.keyId}`);
                }
                catch (error) {
                    logger_1.logger.error(`Error subscribing to API key ${data.keyId}:`, error);
                    socket.emit('error', {
                        message: 'Failed to subscribe to API key updates',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            // 账户订阅
            socket.on('subscribe:account', async (data) => {
                try {
                    socket.join(`account:${data.accountId}`);
                    this.addSubscriber('account', data.accountId, socket.id);
                    // 立即发送初始数据
                    await this.sendInitialAccountData(socket, data.accountId);
                    logger_1.logger.info(`Client ${socket.id} subscribed to account: ${data.accountId}`);
                }
                catch (error) {
                    logger_1.logger.error(`Error subscribing to account ${data.accountId}:`, error);
                    socket.emit('error', {
                        message: 'Failed to subscribe to account updates',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            // 分组订阅
            socket.on('subscribe:group', async (data) => {
                try {
                    socket.join(`group:${data.groupId}`);
                    this.addSubscriber('group', data.groupId, socket.id);
                    // 立即发送初始数据
                    await this.sendInitialGroupData(socket, data.groupId);
                    logger_1.logger.info(`Client ${socket.id} subscribed to group: ${data.groupId}`);
                }
                catch (error) {
                    logger_1.logger.error(`Error subscribing to group ${data.groupId}:`, error);
                    socket.emit('error', {
                        message: 'Failed to subscribe to group updates',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            // 系统指标订阅
            socket.on('subscribe:system', () => {
                try {
                    socket.join('system:metrics');
                    logger_1.logger.info(`Client ${socket.id} subscribed to system metrics`);
                }
                catch (error) {
                    logger_1.logger.error(`Error subscribing to system metrics:`, error);
                }
            });
            // 取消订阅
            socket.on('unsubscribe', (data) => {
                try {
                    const room = `${data.type}:${data.id}`;
                    socket.leave(room);
                    this.removeSubscriber(data.type, data.id, socket.id);
                    logger_1.logger.info(`Client ${socket.id} unsubscribed from ${room}`);
                }
                catch (error) {
                    logger_1.logger.error(`Error unsubscribing from ${data.type}:${data.id}:`, error);
                }
            });
            // 客户端断开连接
            socket.on('disconnect', (reason) => {
                logger_1.logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
                this.cleanupSocketSubscriptions(socket.id);
            });
            // 处理连接错误
            socket.on('error', (error) => {
                logger_1.logger.error(`Socket error for client ${socket.id}:`, error);
            });
        });
        // 处理服务器错误
        this.io.on('error', (error) => {
            logger_1.logger.error('Socket.IO server error:', error);
        });
    }
    /**
     * 发送初始API Key数据
     */
    async sendInitialApiKeyData(socket, keyId) {
        try {
            const statistics = await this.redisDataService.getApiKeyStatistics(keyId);
            if (statistics) {
                socket.emit('apikey:update', statistics);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error sending initial API key data for ${keyId}:`, error);
        }
    }
    /**
     * 发送初始账户数据
     */
    async sendInitialAccountData(socket, accountId) {
        try {
            const statistics = await this.accountService.getAccountStatistics(accountId);
            if (statistics) {
                socket.emit('account:update', statistics);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error sending initial account data for ${accountId}:`, error);
        }
    }
    /**
     * 发送初始分组数据
     */
    async sendInitialGroupData(socket, groupId) {
        try {
            // 这里可以实现分组统计数据获取
            logger_1.logger.info(`Sending initial group data for ${groupId}`);
        }
        catch (error) {
            logger_1.logger.error(`Error sending initial group data for ${groupId}:`, error);
        }
    }
    /**
     * 开始系统指标轮询
     */
    startSystemMetricsPolling() {
        // 每10秒更新一次系统指标
        this.systemMetricsInterval = setInterval(async () => {
            try {
                const metrics = await this.redisDataService.getSystemMetrics();
                this.io.to('system:metrics').emit('metrics:update', metrics);
            }
            catch (error) {
                logger_1.logger.error('Error polling system metrics:', error);
            }
        }, 10000);
        logger_1.logger.info('System metrics polling started');
    }
    /**
     * 订阅Redis数据变化（通过轮询模拟）
     */
    subscribeToRedisChanges() {
        // 由于Redis的keyspace notifications可能不可用，我们使用轮询方式
        // 每30秒检查一次数据变化
        setInterval(async () => {
            await this.pollDataChanges();
        }, 30000);
        logger_1.logger.info('Redis change polling started');
    }
    /**
     * 轮询数据变化
     */
    async pollDataChanges() {
        try {
            // 更新所有订阅的API Keys
            for (const [type, subscriptions] of this.subscribers) {
                if (type === 'apikey') {
                    for (const keyId of subscriptions.keys()) {
                        await this.updateApiKeyData(keyId);
                    }
                }
                else if (type === 'account') {
                    for (const accountId of subscriptions.keys()) {
                        await this.updateAccountData(accountId);
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error polling data changes:', error);
        }
    }
    /**
     * 更新API Key数据
     */
    async updateApiKeyData(keyId) {
        try {
            const statistics = await this.redisDataService.getApiKeyStatistics(keyId);
            if (statistics) {
                this.io.to(`apikey:${keyId}`).emit('apikey:update', statistics);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error updating API key data for ${keyId}:`, error);
        }
    }
    /**
     * 更新账户数据
     */
    async updateAccountData(accountId) {
        try {
            const statistics = await this.accountService.getAccountStatistics(accountId);
            if (statistics) {
                this.io.to(`account:${accountId}`).emit('account:update', statistics);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error updating account data for ${accountId}:`, error);
        }
    }
    /**
     * 添加订阅者
     */
    addSubscriber(type, id, socketId) {
        if (!this.subscribers.has(type)) {
            this.subscribers.set(type, new Map());
        }
        const typeSubscriptions = this.subscribers.get(type);
        if (!typeSubscriptions.has(id)) {
            typeSubscriptions.set(id, new Set());
        }
        typeSubscriptions.get(id).add(socketId);
    }
    /**
     * 移除订阅者
     */
    removeSubscriber(type, id, socketId) {
        const typeSubscriptions = this.subscribers.get(type);
        if (typeSubscriptions && typeSubscriptions.has(id)) {
            typeSubscriptions.get(id).delete(socketId);
            // 如果没有订阅者了，删除该订阅
            if (typeSubscriptions.get(id).size === 0) {
                typeSubscriptions.delete(id);
            }
        }
    }
    /**
     * 清理Socket的所有订阅
     */
    cleanupSocketSubscriptions(socketId) {
        for (const [type, typeSubscriptions] of this.subscribers) {
            for (const [id, subscribers] of typeSubscriptions) {
                subscribers.delete(socketId);
                if (subscribers.size === 0) {
                    typeSubscriptions.delete(id);
                }
            }
        }
    }
    /**
     * 发送告警消息
     */
    sendAlert(type, title, message, data) {
        this.io.emit('alert', {
            type,
            title,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * 获取连接统计信息
     */
    getConnectionStats() {
        const subscriberCount = {};
        for (const [type, typeSubscriptions] of this.subscribers) {
            subscriberCount[type] = typeSubscriptions.size;
        }
        return {
            totalConnections: this.io.sockets.sockets.size,
            subscriberCount
        };
    }
    /**
     * 关闭实时服务
     */
    async close() {
        if (this.systemMetricsInterval) {
            clearInterval(this.systemMetricsInterval);
        }
        this.io.close();
        logger_1.logger.info('Realtime service closed');
    }
}
exports.RealtimeService = RealtimeService;
//# sourceMappingURL=RealtimeService.js.map