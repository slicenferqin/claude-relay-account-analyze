"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisDataServiceExtension = void 0;
const redis_1 = require("../config/redis");
// 扩展RedisDataService类，添加缺少的方法
class RedisDataServiceExtension {
    async healthCheck() {
        return await redis_1.redisClient.healthCheck();
    }
    async smembers(key) {
        return await redis_1.redisClient.smembers(key);
    }
}
exports.RedisDataServiceExtension = RedisDataServiceExtension;
//# sourceMappingURL=RedisDataServiceExtension.js.map