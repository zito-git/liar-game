import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { CreateModule } from './create/create.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), GameModule, RedisModule, CreateModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
