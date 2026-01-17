import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
