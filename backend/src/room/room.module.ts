import { Module } from '@nestjs/common';
import { CustomJwtModule } from 'src/jwt/custom-jwt.module';
import { RedisModule } from 'src/redis/redis.module';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  imports: [RedisModule, CustomJwtModule],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
