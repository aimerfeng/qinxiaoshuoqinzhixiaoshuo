import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

/**
 * S3 文件存储服务
 * 支持 MinIO（本地开发）和 AWS S3（生产环境）
 */
@Injectable()
export class S3Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(S3Service.name);
  private client!: S3Client;
  private bucket!: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeClient();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.logger.log('S3 client destroyed');
    }
  }

  /**
   * 初始化 S3 客户端
   */
  private async initializeClient(): Promise<void> {
    const endpoint = this.configService.get<string>('storage.s3.endpoint');
    const region = this.configService.get<string>(
      'storage.s3.region',
      'us-east-1',
    );
    const accessKeyId = this.configService.get<string>(
      'storage.s3.accessKeyId',
    );
    const secretAccessKey = this.configService.get<string>(
      'storage.s3.secretAccessKey',
    );
    const forcePathStyle = this.configService.get<boolean>(
      'storage.s3.forcePathStyle',
      true,
    );
    this.bucket = this.configService.get<string>(
      'storage.s3.bucket',
      'project-anima',
    );

    // 检查必要配置
    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'S3 credentials not configured, storage service disabled',
      );
      return;
    }

    this.logger.log(
      `Initializing S3 client (endpoint: ${endpoint || 'AWS S3'})`,
    );

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle, // MinIO 需要 path-style URLs
    });

    this.isConfigured = true;

    // 确保默认 bucket 存在
    await this.ensureBucketExists();
  }

  /**
   * 确保 bucket 存在，不存在则创建
   */
  private async ensureBucketExists(): Promise<void> {
    if (!this.isConfigured) return;

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NotFound') {
        this.logger.log(`Bucket "${this.bucket}" not found, creating...`);
        try {
          await this.client.send(
            new CreateBucketCommand({ Bucket: this.bucket }),
          );
          this.logger.log(`Bucket "${this.bucket}" created successfully`);
        } catch (createError) {
          this.logger.error(`Failed to create bucket: ${createError}`);
          throw createError;
        }
      } else {
        this.logger.error(`Failed to check bucket: ${error}`);
        throw error;
      }
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * 检查 S3 连接健康状态
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 上传文件
   * @param key 文件路径/键名
   * @param body 文件内容
   * @param contentType MIME 类型
   * @param metadata 可选的元数据
   */
  async uploadFile(
    key: string,
    body: Buffer | Readable | string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; url: string }> {
    this.ensureConfigured();

    this.logger.debug(`Uploading file: ${key} (${contentType})`);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: metadata,
        }),
      );

      const url = this.getPublicUrl(key);
      this.logger.debug(`File uploaded successfully: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}: ${error}`);
      throw error;
    }
  }

  /**
   * 下载文件
   * @param key 文件路径/键名
   * @returns 文件内容流和元数据
   */
  async downloadFile(key: string): Promise<{
    body: Readable;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }> {
    this.ensureConfigured();

    this.logger.debug(`Downloading file: ${key}`);

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        body: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to download file ${key}: ${error}`);
      throw error;
    }
  }

  /**
   * 删除文件
   * @param key 文件路径/键名
   */
  async deleteFile(key: string): Promise<void> {
    this.ensureConfigured();

    this.logger.debug(`Deleting file: ${key}`);

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.debug(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${error}`);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param key 文件路径/键名
   */
  async fileExists(key: string): Promise<boolean> {
    this.ensureConfigured();

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 列出指定前缀的文件
   * @param prefix 文件前缀
   * @param maxKeys 最大返回数量
   */
  async listFiles(
    prefix?: string,
    maxKeys = 1000,
  ): Promise<
    Array<{
      key: string;
      size?: number;
      lastModified?: Date;
    }>
  > {
    this.ensureConfigured();

    this.logger.debug(`Listing files with prefix: ${prefix || '(none)'}`);

    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys,
        }),
      );

      const files = (response.Contents || []).map((item) => ({
        key: item.Key!,
        size: item.Size,
        lastModified: item.LastModified,
      }));

      this.logger.debug(`Found ${files.length} files`);
      return files;
    } catch (error) {
      this.logger.error(`Failed to list files: ${error}`);
      throw error;
    }
  }

  /**
   * 生成预签名下载 URL
   * @param key 文件路径/键名
   * @param expiresIn 过期时间（秒），默认 3600（1小时）
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.ensureConfigured();

    this.logger.debug(`Generating presigned download URL for: ${key}`);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      this.logger.debug(`Presigned URL generated (expires in ${expiresIn}s)`);

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error}`);
      throw error;
    }
  }

  /**
   * 生成预签名上传 URL
   * @param key 文件路径/键名
   * @param contentType MIME 类型
   * @param expiresIn 过期时间（秒），默认 3600（1小时）
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    this.ensureConfigured();

    this.logger.debug(`Generating presigned upload URL for: ${key}`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      this.logger.debug(
        `Presigned upload URL generated (expires in ${expiresIn}s)`,
      );

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned upload URL: ${error}`);
      throw error;
    }
  }

  /**
   * 获取文件的公开 URL（不带签名）
   * 注意：需要 bucket 配置为公开访问才能使用
   */
  getPublicUrl(key: string): string {
    const endpoint = this.configService.get<string>('storage.s3.endpoint');
    const forcePathStyle = this.configService.get<boolean>(
      'storage.s3.forcePathStyle',
      true,
    );

    if (endpoint) {
      // MinIO 或自定义 endpoint
      if (forcePathStyle) {
        return `${endpoint}/${this.bucket}/${key}`;
      }
      return `${endpoint.replace('://', `://${this.bucket}.`)}/${key}`;
    }

    // AWS S3
    const region = this.configService.get<string>(
      'storage.s3.region',
      'us-east-1',
    );
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * 确保服务已配置
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error(
        'S3 service is not configured. Please check your environment variables.',
      );
    }
  }

  /**
   * 获取当前 bucket 名称
   */
  getBucket(): string {
    return this.bucket;
  }
}
