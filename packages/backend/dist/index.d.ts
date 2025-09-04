import { Application } from 'express';
export declare class App {
    private app;
    private server;
    private realtimeService?;
    constructor();
    /**
     * 设置中间件
     */
    private setupMiddleware;
    /**
     * 设置路由
     */
    private setupRoutes;
    /**
     * 设置错误处理
     */
    private setupErrorHandling;
    /**
     * 启动服务器
     */
    start(): Promise<void>;
    /**
     * 优雅关闭
     */
    private gracefulShutdown;
    /**
     * 获取Express应用实例
     */
    getApp(): Application;
    /**
     * 获取HTTP服务器实例
     */
    getServer(): any;
}
export default App;
//# sourceMappingURL=index.d.ts.map