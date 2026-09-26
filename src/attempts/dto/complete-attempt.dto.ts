import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Gender } from "../../generated/prisma/enums";

export class CompleteAnswerDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: "AGREE" })
  @IsString()
  value!: string;
}

export class CompleteAttemptDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  quizVersionId!: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ type: [CompleteAnswerDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CompleteAnswerDto)
  answers!: CompleteAnswerDto[];
}
