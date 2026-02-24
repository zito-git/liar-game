import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CustomJwtModule } from 'src/jwt/custom-jwt.module';
import { CustomJwtService } from 'src/jwt/custom-jwt.service';
import { RedisService } from 'src/redis/redis.service';

enum RoomStatus {
  WAIT = 'WAIT',
  PLAYING = 'PLAYING',
  END = 'END',
}

@Injectable()
export class RoomService {
  constructor(
    private readonly redis: RedisService,
    private readonly jwt: CustomJwtService,
  ) {}

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

  async joinRoom(roomId: string, jwtToken: string) {
    // JWT 검증 + 방 존재 확인만 수행 (인원 관리는 소켓에서 단독 담당)
    if ((await this.jwt.verifyJwt(jwtToken)) == null) {
      throw new UnauthorizedException('jwt 검증실패');
    }
    const key = `room:${roomId}`;

    const room = await this.redis.client.hgetall(key);

    if (Object.keys(room).length === 0) {
      throw new NotFoundException('방이 존재하지 않습니다.');
    }

    return {
      roomId,
      roomJoin: true,
      players: Number(room.players),
      maxPlayers: Number(room.maxPlayers),
    };
  }

  async quitRoom(roomId: string) {
    const key = `room:${roomId}`;
    const membersKey = `room:${roomId}:members`;

    const room = await this.redis.client.hgetall(key);
    const maxPlayers = Number(room.maxPlayers);

    if (Object.keys(room).length === 0) {
      throw new NotFoundException('방이 존재하지 않습니다.');
    }

    // 인원 감소
    await this.redis.client.hincrby(key, 'players', -1);

    // 현재 인원 조회
    const players = Number(await this.redis.client.hget(key, 'players'));

    // 인원이 0명이면 방(hash)과 members(Set) 모두 삭제
    if (players <= 0) {
      await this.redis.client.del(key);
      await this.redis.client.del(membersKey);
      return { roomDeleted: true, players: 0, maxPlayers };
    }

    return { roomId, roomDeleted: false, players, maxPlayers };
  }

  async createNickname(nickname: string) {
    const result = {
      nickname,
      Authorization: await this.jwt.createJwt(nickname),
    };
    return result;
  }
}
