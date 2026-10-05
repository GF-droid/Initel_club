import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
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

  /** 可选的物资编码。不传时按名称匹配主数据，没有就自动建档。 */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  skuCode?: string;
}

export class InboundBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => InboundDto)
  items!: InboundDto[];
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

  /** 可选的物资编码。不传时按名称匹配主数据。 */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  skuCode?: string;
}

export class LedgerQueryDto {
  @IsOptional()
  @IsIn(ROOM_IDS)
  roomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  skuCode?: string;

  /** 按物资名称快照模糊匹配 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @IsIn(['inbound', 'outbound', 'adjust'])
  operation?: string;

  /** 与 endTime 成对提供；接受 ISO 8601 或 'YYYY-MM-DD HH:MM:SS' */
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
