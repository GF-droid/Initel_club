import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class AirConditionerCommandDto {
  @IsBoolean()
  power!: boolean;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(16)
  @Max(30)
  targetTemperature!: number;

  @IsIn(['cool'])
  mode!: 'cool';

  @IsOptional()
  @IsIn(['manual', 'smart'])
  source?: 'manual' | 'smart';

  @IsOptional()
  @IsString()
  operator?: string;
}
