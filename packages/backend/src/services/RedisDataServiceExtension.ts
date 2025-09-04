import { redisClient } from '../config/redis';

// 扩展RedisDataService类，添加缺少的方法
export class RedisDataServiceExtension {
  
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    return await redisClient.healthCheck();
  }

  async smembers(key: string): Promise<string[]> {
    return await redisClient.smembers(key);
  }
}