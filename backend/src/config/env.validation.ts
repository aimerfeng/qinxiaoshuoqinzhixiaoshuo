import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  PORT: number = 3001;

  @IsString()
  API_PREFIX: string = '/api/v1';

  @IsString()
  FRONTEND_URL: string = 'http://localhost:3000';

  // ===========================================
  // Database (PostgreSQL)
  // ===========================================
  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  // ===========================================
  // Redis
  // ===========================================
  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  // ===========================================
  // JWT Authentication
  // ===========================================
  @IsString()
  JWT_SECRET: string = 'dev-secret-key';

  @IsString()
  JWT_ACCESS_EXPIRY: string = '24h';

  @IsString()
  JWT_REFRESH_EXPIRY: string = '7d';

  // ===========================================
  // S3 Compatible Storage (MinIO)
  // ===========================================
  @IsString()
  @IsOptional()
  S3_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  S3_REGION?: string;

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  S3_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  S3_BUCKET?: string;

  @IsString()
  @IsOptional()
  S3_FORCE_PATH_STYLE?: string;

  // ===========================================
  // Logging
  // ===========================================
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
