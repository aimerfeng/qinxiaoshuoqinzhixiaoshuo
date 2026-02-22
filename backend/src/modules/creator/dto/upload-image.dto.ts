/**
 * 图片上传响应 DTO
 *
 * 任务 8.1.4: 图片上传 API
 */
export class UploadImageResponseDto {
  /**
   * 上传成功标志
   */
  success: boolean;

  /**
   * 图片访问 URL
   */
  url: string;

  /**
   * 文件大小（字节）
   */
  size: number;

  /**
   * 文件类型
   */
  contentType: string;
}
