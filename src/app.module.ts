import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AttemptsModule } from "./attempts/attempts.module";
import { AuthModule } from "./auth/auth.module";
import { validateEnvironment } from "./config/environment.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { QuizModule } from "./quiz/quiz.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    QuizModule,
    AttemptsModule,
    AuthModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
