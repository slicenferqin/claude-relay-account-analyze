import { Server as HttpServer } from 'http';
export declare class RealtimeService {
    private io;
    private redisDataService;
    private accountService;
    private systemMetricsInterval?;
    private subscribers;
    constructor(httpServer: HttpServer);
    /**
     * 设置Socket连接处理器
     */
    private setupSocketHandlers;
    /**
     * 发送初始API Key数据
     */
    private sendInitialApiKeyData;
    /**
     * 发送初始账户数据
     */
    private sendInitialAccountData;
    /**
     * 发送初始分组数据
     */
    private sendInitialGroupData;
    /**
     * 开始系统指标轮询
     */
    private startSystemMetricsPolling;
    /**
     * 订阅Redis数据变化（通过轮询模拟）
     */
    private subscribeToRedisChanges;
    /**
     * 轮询数据变化
     */
    private pollDataChanges;
    /**
     * 更新API Key数据
     */
    private updateApiKeyData;
    /**
     * 更新账户数据
     */
    private updateAccountData;
    /**
     * 添加订阅者
     */
    private addSubscriber;
    /**
     * 移除订阅者
     */
    private removeSubscriber;
    /**
     * 清理Socket的所有订阅
     */
    private cleanupSocketSubscriptions;
    /**
     * 发送告警消息
     */
    sendAlert(type: 'warning' | 'error' | 'info' | 'success', title: string, message: string, data?: any): void;
    /**
     * 获取连接统计信息
     */
    getConnectionStats(): {
        totalConnections: number;
        subscriberCount: Record<string, number>;
    };
    /**
     * 关闭实时服务
     */
    close(): Promise<void>;
}
//# sourceMappingURL=RealtimeService.d.ts.map