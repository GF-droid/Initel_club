import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOperationLogDto {
  @IsString()
  @MaxLength(32)
  operationType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  roomId?: string;

  @IsString()
  @MaxLength(64)
  action!: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  operator?: string;
}
