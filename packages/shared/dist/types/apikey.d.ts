export interface ApiKeyInfo {
    id: string;
    name: string;
    description?: string;
    apiKey?: string;
    tokenLimit?: number;
    concurrencyLimit?: number;
    rateLimitWindow?: number;
    rateLimitRequests?: number;
    isActive: boolean;
    claudeAccountId?: string;
    permissions?: 'all' | 'claude' | 'gemini' | 'openai';
    dailyCostLimit?: number;
    tags?: string[];
    createdAt: string;
    lastUsedAt: string;
    expiresAt?: string;
    createdBy?: string;
    userId?: string;
    userUsername?: string;
}
export interface ApiKeyStatistics {
    keyId: string;
    name: string;
    description?: string;
    lastUsedAt: string;
    rpm: number;
    isActive: boolean;
    currentGroup?: {
        id: string;
        name: string;
    };
    usage: {
        today: {
            requests: number;
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
            cost: number;
        };
        last10Minutes: {
            avgRpm: number;
            totalRequests: number;
        };
        hourly?: Array<{
            hour: string;
            requests: number;
            tokens: number;
            cost: number;
        }>;
    };
    limits: {
        dailyCostLimit?: number;
        tokenLimit?: number;
        concurrencyLimit?: number;
    };
    tags?: string[];
}
export interface UsageData {
    tokens?: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreateTokens?: number;
    cacheReadTokens?: number;
    allTokens: number;
    requests: number;
    ephemeral5mTokens?: number;
    ephemeral1hTokens?: number;
    longContextInputTokens?: number;
    longContextOutputTokens?: number;
    longContextRequests?: number;
}
export interface TimeRange {
    start: Date;
    end: Date;
}
export type TimeRangeType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';
