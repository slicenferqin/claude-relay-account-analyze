import { Request, Response } from 'express';
export declare class DashboardController {
    private redisDataService;
    private accountService;
    constructor();
    /**
     * 获取所有API Key统计信息
     */
    getApiKeys(req: Request, res: Response): Promise<void>;
    /**
     * 获取单个API Key统计信息
     */
    getApiKey(req: Request, res: Response): Promise<void>;
    /**
     * 获取API Key使用趋势
     */
    getApiKeyUsage(req: Request, res: Response): Promise<void>;
    /**
     * 获取所有账户统计信息
     */
    getAccounts(req: Request, res: Response): Promise<void>;
    /**
     * 获取单个账户统计信息
     */
    getAccount(req: Request, res: Response): Promise<void>;
    /**
     * 获取账户费用明细
     */
    getAccountCost(req: Request, res: Response): Promise<void>;
    /**
     * 获取所有分组信息
     */
    getGroups(req: Request, res: Response): Promise<void>;
    /**
     * 获取分组成员信息
     */
    getGroupMembers(req: Request, res: Response): Promise<void>;
    /**
     * 获取实时系统指标
     */
    getSystemMetrics(req: Request, res: Response): Promise<void>;
    /**
     * 健康检查端点
     */
    healthCheck(req: Request, res: Response): Promise<void>;
    private filterApiKeys;
    private searchApiKeys;
    private sortApiKeyStatistics;
    private filterAccounts;
    private searchAccounts;
    private sortAccountStatistics;
    private getGroupApiKeys;
}
//# sourceMappingURL=DashboardController.d.ts.map