/**
 * 头像上传响应 DTO
 */
export interface AvatarUploadResponseDto {
  message: string;
  avatar: {
    url: string;
    thumbnails: {
      small: string; // 128x128
      medium: string; // 256x256
    };
  };
}
