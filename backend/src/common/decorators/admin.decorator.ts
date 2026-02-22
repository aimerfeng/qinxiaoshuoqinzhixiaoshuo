import { SetMetadata } from '@nestjs/common';

/**
 * 管理员权限标记键
 * 用于标识需要管理员权限的路由
 */
export const IS_ADMIN_KEY = 'isAdmin';

/**
 * @Admin() 装饰器
 * 用于标记需要管理员权限的路由
 * 
 * 使用示例:
 * @Admin()
 * @Get('users')
 * async getUsers() { ... }
 * 
 * 需求18验收标准1: WHEN 运营人员登录后台 THEN System SHALL 验证权限并显示对应功能模块
 */
export const Admin = () => SetMetadata(IS_ADMIN_KEY, true);
