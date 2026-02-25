import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filter/global.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: '*', // 모든 도메인 허용
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // 쿠키 등 인증 허용
  });

  const config = new DocumentBuilder()
    .setTitle('Room API')
    .setDescription('Room 관리 API 문서')
    .setVersion('1.0')
    .addBearerAuth() // JWT 인증 버튼 추가
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 5001);
}
bootstrap();
