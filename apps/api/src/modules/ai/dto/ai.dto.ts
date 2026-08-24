import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ReportDto {
  @IsOptional()
  @IsString()
  reportType?: string;

  @IsOptional()
  @IsString()
  dateRange?: string;
}
