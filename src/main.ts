import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { DEFAULT_AUTH_COOKIE_NAME } from "./config/config.constants";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string>("FRONTEND_URL"),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ADHD Test API")
    .setDescription("API for the ADHD test funnel")
    .setVersion("1.0")
    .addCookieAuth(
      config.get<string>("AUTH_COOKIE_NAME", DEFAULT_AUTH_COOKIE_NAME),
    )
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.get<number>("PORT", 4000));
}

void bootstrap();
