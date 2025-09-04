"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.RedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class RedisClient {
    constructor() {
        const config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0'),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger_1.logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
            lazyConnect: true
        };
        this.client = new ioredis_1.default(config);
        this.subscriber = new ioredis_1.default(config);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            logger_1.logger.info('Redis client connected');
        });
        this.client.on('error', (err) => {
            logger_1.logger.error('Redis client error:', err);
        });
        this.client.on('close', () => {
            logger_1.logger.warn('Redis client connection closed');
        });
        this.subscriber.on('connect', () => {
            logger_1.logger.info('Redis subscriber connected');
        });
        this.subscriber.on('error', (err) => {
            logger_1.logger.error('Redis subscriber error:', err);
        });
    }
    async connect() {
        try {
            await this.client.connect();
            await this.subscriber.connect();
            logger_1.logger.info('Redis connections established');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        await this.client.quit();
        await this.subscriber.quit();
        logger_1.logger.info('Redis connections closed');
    }
    getClient() {
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    async ping() {
        return await this.client.ping();
    }
    // 基础操作方法
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting key ${key}:`, error);
            throw error;
        }
    }
    async set(key, value, ttl) {
        try {
            if (ttl) {
                return await this.client.setex(key, ttl, value);
            }
            return await this.client.set(key, value);
        }
        catch (error) {
            logger_1.logger.error(`Error setting key ${key}:`, error);
            throw error;
        }
    }
    async hgetall(key) {
        try {
            return await this.client.hgetall(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting hash ${key}:`, error);
            throw error;
        }
    }
    async hget(key, field) {
        try {
            return await this.client.hget(key, field);
        }
        catch (error) {
            logger_1.logger.error(`Error getting hash field ${key}.${field}:`, error);
            throw error;
        }
    }
    async hset(key, field, value) {
        try {
            return await this.client.hset(key, field, value);
        }
        catch (error) {
            logger_1.logger.error(`Error setting hash field ${key}.${field}:`, error);
            throw error;
        }
    }
    async smembers(key) {
        try {
            return await this.client.smembers(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting set members ${key}:`, error);
            throw error;
        }
    }
    async scard(key) {
        try {
            return await this.client.scard(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting set cardinality ${key}:`, error);
            throw error;
        }
    }
    async lrange(key, start, stop) {
        try {
            return await this.client.lrange(key, start, stop);
        }
        catch (error) {
            logger_1.logger.error(`Error getting list range ${key}:`, error);
            throw error;
        }
    }
    async ttl(key) {
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting TTL for key ${key}:`, error);
            throw error;
        }
    }
    async type(key) {
        try {
            return await this.client.type(key);
        }
        catch (error) {
            logger_1.logger.error(`Error getting type for key ${key}:`, error);
            throw error;
        }
    }
    // 扫描keys
    async scanKeys(pattern, count = 100) {
        const keys = [];
        let cursor = '0';
        try {
            do {
                const [nextCursor, matchedKeys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
                cursor = nextCursor;
                keys.push(...matchedKeys);
            } while (cursor !== '0');
            return keys;
        }
        catch (error) {
            logger_1.logger.error(`Error scanning keys with pattern ${pattern}:`, error);
            throw error;
        }
    }
    // 批量操作
    async pipeline(commands) {
        const pipeline = this.client.pipeline();
        for (const [command, ...args] of commands) {
            pipeline[command](...args);
        }
        try {
            const results = await pipeline.exec();
            return results?.map(([err, result]) => {
                if (err)
                    throw err;
                return result;
            }) || [];
        }
        catch (error) {
            logger_1.logger.error('Error executing pipeline:', error);
            throw error;
        }
    }
    // 健康检查
    async healthCheck() {
        try {
            const start = Date.now();
            await this.ping();
            const latency = Date.now() - start;
            return {
                status: 'healthy',
                latency
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.RedisClient = RedisClient;
// 单例模式
exports.redisClient = new RedisClient();
//# sourceMappingURL=redis.js.map