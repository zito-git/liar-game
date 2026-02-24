import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { CustomJwtModule } from 'src/jwt/custom-jwt.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [CustomJwtModule, RedisModule],
  providers: [GameGateway],
})
export class GameModule {}
