import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 8080;
  app.enableCors();
  await app.listen(port);
  console.log(`listen on port ${port}`);
}
bootstrap();
