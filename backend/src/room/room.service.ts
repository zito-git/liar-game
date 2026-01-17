import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/redis/redis.service';

enum RoomStatus {
  WAIT = 'WAIT',
  PLAYING = 'PLAYING',
  END = 'END',
}

@Injectable()
export class RoomService {
  constructor(private readonly redis: RedisService) {}

  async createRoom(): Promise<{ roomId: string }> {
    const uuidRoom: string = randomUUID();
    const key = `room:${uuidRoom}`;
    const time: number = 60 * 30;
    const maxPlayer = 4;

    await this.redis.client.hset(key, {
      status: RoomStatus.WAIT,
      players: 0,
      maxPlayers: maxPlayer,
      created: Date.now().toString(),
    });

    await this.redis.client.expire(key, time);

    return { roomId: uuidRoom };
  }

  async joinRoom(roomId: string) {
    const key = `room:${roomId}`;

    const room = await this.redis.client.hgetall(key);

    if (Object.keys(room).length === 0) {
      throw new NotFoundException('방이 존재하지 않습니다.');
    }

    const players = Number(room.players);
    const maxPlayers = Number(room.maxPlayers);

    if (players >= maxPlayers) {
      throw new BadRequestException('방이 가득 찼습니다.');
    }

    await this.redis.client.hincrby(key, 'players', 1);

    return { roomJoin: true, players: players + 1, maxPlayers };
  }

  async quitRoom(roomId: string) {
    const key = `room:${roomId}`;

    const room = await this.redis.client.hgetall(key);
    const maxPlayers = room.maxPlayers;

    if (Object.keys(room).length === 0) {
      throw new NotFoundException('방이 존재하지 않습니다.');
    }

    // 인원 감소
    await this.redis.client.hincrby(key, 'players', -1);

    // 현재 인원 조회
    const players = Number(await this.redis.client.hget(key, 'players'));

    // 인원이 0명이면 방 삭제
    if (players <= 0) {
      await this.redis.client.del(key);
      return { roomDeleted: true, players: 0, maxPlayers };
    }

    return { roomDeleted: false, players, maxPlayers };
  }
}
