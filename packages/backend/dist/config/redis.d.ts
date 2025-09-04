import Redis from 'ioredis';
export declare class RedisClient {
    private client;
    private subscriber;
    constructor();
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getClient(): Redis;
    getSubscriber(): Redis;
    ping(): Promise<string>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<'OK'>;
    hgetall(key: string): Promise<Record<string, string>>;
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<number>;
    smembers(key: string): Promise<string[]>;
    scard(key: string): Promise<number>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    ttl(key: string): Promise<number>;
    type(key: string): Promise<string>;
    scanKeys(pattern: string, count?: number): Promise<string[]>;
    pipeline(commands: Array<[string, ...any[]]>): Promise<any[]>;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        latency?: number;
        error?: string;
    }>;
}
export declare const redisClient: RedisClient;
//# sourceMappingURL=redis.d.ts.map