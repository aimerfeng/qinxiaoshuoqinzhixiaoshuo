import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * 错误响应结构
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
}

/**
 * 全局异常过滤器
 *
 * 根据需求10验收标准6：记录详细日志并支持问题追溯
 *
 * 功能：
 * 1. 统一错误响应格式
 * 2. 记录详细错误日志
 * 3. 处理不同类型的异常
 * 4. 隐藏敏感错误信息（生产环境）
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'] as string;
    const userId = (request as any).user?.id;

    // 解析异常
    const { statusCode, message, error, details, stack } =
      this.parseException(exception);

    // 构建错误响应
    const errorResponse: ErrorResponse = {
      statusCode,
      message:
        this.isProduction && statusCode >= 500 ? '服务暂时不可用' : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // 非生产环境添加详细信息
    if (!this.isProduction && details) {
      errorResponse.details = details;
    }

    // 记录错误日志
    this.logError({
      statusCode,
      message,
      error,
      path: request.url,
      method: request.method,
      requestId,
      userId,
      stack,
      body: this.sanitizeBody(request.body),
      query: request.query,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    // 发送响应
    response.status(statusCode).json(errorResponse);
  }

  /**
   * 解析异常
   */
  private parseException(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
    details?: unknown;
    stack?: string;
  } {
    // HTTP 异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode: status,
          message: response,
          error: HttpStatus[status] || 'Error',
          stack: exception.stack,
        };
      }

      const responseObj = response as Record<string, unknown>;
      return {
        statusCode: status,
        message: (responseObj.message as string) || exception.message,
        error: (responseObj.error as string) || HttpStatus[status] || 'Error',
        details: responseObj.details,
        stack: exception.stack,
      };
    }

    // Prisma 异常
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.parsePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: '数据验证失败',
        error: 'Validation Error',
        details: this.isProduction ? undefined : exception.message,
        stack: exception.stack,
      };
    }

    // 通用错误
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        error: 'Internal Server Error',
        stack: exception.stack,
      };
    }

    // 未知错误
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '未知错误',
      error: 'Internal Server Error',
    };
  }

  /**
   * 解析 Prisma 错误
   */
  private parsePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
    details?: unknown;
    stack?: string;
  } {
    switch (error.code) {
      case 'P2002':
        // 唯一约束冲突
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `${target} 已存在`,
          error: 'Conflict',
          details: this.isProduction ? undefined : { code: error.code, target },
          stack: error.stack,
        };

      case 'P2025':
        // 记录不存在
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: '资源不存在',
          error: 'Not Found',
          stack: error.stack,
        };

      case 'P2003':
        // 外键约束失败
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '关联数据不存在',
          error: 'Bad Request',
          stack: error.stack,
        };

      case 'P2014':
        // 关系违规
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '数据关系错误',
          error: 'Bad Request',
          stack: error.stack,
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '数据库操作失败',
          error: 'Database Error',
          details: this.isProduction ? undefined : { code: error.code },
          stack: error.stack,
        };
    }
  }

  /**
   * 记录错误日志
   */
  private logError(data: {
    statusCode: number;
    message: string;
    error: string;
    path: string;
    method: string;
    requestId?: string;
    userId?: string;
    stack?: string;
    body?: unknown;
    query?: unknown;
    ip?: string;
    userAgent?: string;
  }): void {
    const {
      statusCode,
      message,
      error,
      path,
      method,
      requestId,
      userId,
      stack,
      ...rest
    } = data;

    const logData = {
      statusCode,
      error,
      path,
      method,
      requestId,
      userId,
      ...rest,
    };

    // 5xx 错误使用 error 级别
    if (statusCode >= 500) {
      this.logger.error(
        `[${method}] ${path} - ${statusCode} ${error}: ${message}`,
        stack,
        logData,
      );
    } else if (statusCode >= 400) {
      // 4xx 错误使用 warn 级别
      this.logger.warn(
        `[${method}] ${path} - ${statusCode} ${error}: ${message}`,
        logData,
      );
    }
  }

  /**
   * 清理请求体中的敏感信息
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
    ];
    const sanitized = { ...body } as Record<string, unknown>;

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
