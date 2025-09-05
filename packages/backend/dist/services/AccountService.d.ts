import { AccountInfo, AccountStatistics, AccountGroup } from '@account-dashboard/shared';
export declare class AccountService {
    /**
     * 获取账户基本信息
     */
    getAccountInfo(accountId: string): Promise<AccountInfo | null>;
    /**
     * 从key中提取平台信息
     */
    private extractPlatformFromKey;
    /**
     * 获取账户使用统计
     */
    getAccountUsage(accountId: string, dateStr: string): Promise<any>;
    /**
     * 计算账户的近期RPM
     */
    calculateAccountRPM(accountId: string, minutes?: number): Promise<number>;
    /**
     * 获取账户关联的API Keys并计算费用
     */
    calculateAccountDailyCost(accountId: string, date: string): Promise<number>;
    /**
     * 计算账号下所有用户的费用总和
     */
    calculateAccountUsersCost(accountId: string, date: string): Promise<number>;
    /**
     * 获取账号下的所有用户ID
     */
    getAccountUsers(accountId: string): Promise<string[]>;
    /**
     * 计算单个用户的日费用
     */
    calculateUserDailyCost(userId: string, date: string): Promise<number>;
    /**
     * 获取账户关联的API Keys
     */
    getAccountApiKeys(accountId: string): Promise<string[]>;
    /**
     * 获取账户所属分组
     */
    getAccountGroup(accountId: string): Promise<{
        id: string;
        name: string;
        totalMembers: number;
        activeMembers: number;
    } | undefined>;
    /**
     * 计算分组中的活跃成员数（近10分钟有活动）
     */
    private countActiveGroupMembers;
    /**
     * 获取完整的账户统计信息
     */
    getAccountStatistics(accountId: string): Promise<AccountStatistics | null>;
    /**
     * 获取账户的小时级数据
     */
    private getAccountHourlyData;
    /**
     * 获取所有账户列表
     */
    getAllAccounts(): Promise<string[]>;
    /**
     * 获取多个账户的统计信息
     */
    getMultipleAccountStatistics(accountIds: string[]): Promise<AccountStatistics[]>;
    /**
     * 获取所有分组信息
     */
    getAllGroups(): Promise<AccountGroup[]>;
}
//# sourceMappingURL=AccountService.d.ts.map