export declare class RedisDataServiceExtension {
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        latency?: number;
        error?: string;
    }>;
    smembers(key: string): Promise<string[]>;
}
//# sourceMappingURL=RedisDataServiceExtension.d.ts.map