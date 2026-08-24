import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ROOM_IDS } from '../../telemetry/telemetry.constants';

export class InboundDto {
  @IsIn(ROOM_IDS)
  home!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  number!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  unity?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class OutboundDto {
  @IsIn(ROOM_IDS)
  home!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  number!: number;

  @IsOptional()
  @IsString()
  unity?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
