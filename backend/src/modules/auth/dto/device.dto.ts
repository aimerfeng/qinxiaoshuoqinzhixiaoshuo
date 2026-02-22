import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 移除设备 DTO
 */
export class RemoveDeviceDto {
  @IsString()
  @IsNotEmpty({ message: '设备ID不能为空' })
  deviceId!: string;
}
