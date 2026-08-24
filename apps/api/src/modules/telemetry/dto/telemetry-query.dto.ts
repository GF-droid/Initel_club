import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LimitQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class HistoryQueryDto extends LimitQueryDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class CompareQueryDto extends LimitQueryDto {
  @IsOptional()
  @IsString()
  rooms?: string;

  @IsOptional()
  @IsIn(['wendu', 'shidu'])
  type?: 'wendu' | 'shidu';
}
