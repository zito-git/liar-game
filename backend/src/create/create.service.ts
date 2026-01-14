import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/redis/redis.service';

export enum RoomStatus {
  WAIT = 'WAIT',
  PLAYING = 'PLAYING',
  END = 'END',
}

@Injectable()
export class CreateService {
  constructor(private readonly redis: RedisService) {}

  async createRoom() {
    const uuidRoom: string = randomUUID();
    const key = `room:${uuidRoom}`;
    const time: number = 60 * 30;

    await this.redis.client.hset(key, {
      status: RoomStatus.WAIT,
      players: 0,
      created: Date.now().toString(),
    });

    await this.redis.client.expire(key, time);

    return { roomId: uuidRoom };
  }
}
