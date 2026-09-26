import { ApiProperty } from "@nestjs/swagger";

export class QuizOptionResponse {
  @ApiProperty({ example: "AGREE" })
  value!: string;

  @ApiProperty({ example: "Agree" })
  label!: string;
}

export class QuizQuestionResponse {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "loses_track_of_time" })
  key!: string;

  @ApiProperty({ example: "SINGLE_CHOICE" })
  type!: string;

  @ApiProperty({
    example: "I easily lose track of time when doing something I enjoy",
  })
  title!: string;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiProperty({ type: [QuizOptionResponse] })
  options!: QuizOptionResponse[];
}

export class CurrentQuizResponse {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ type: [QuizQuestionResponse] })
  questions!: QuizQuestionResponse[];
}
