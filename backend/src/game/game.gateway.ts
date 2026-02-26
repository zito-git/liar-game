import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomJwtService } from 'src/jwt/custom-jwt.service';
import { RedisService } from 'src/redis/redis.service';
import { ResultCategory } from './result.category';

// 원자적 닉네임 중복 체크 + 정원 체크 + 멤버 추가 Lua 스크립트
// 반환값: -1 = 닉네임 중복, 0 = 방 가득 참, 1 = 성공
const LUA_ADD_MEMBER = `
  local exists = redis.call('SISMEMBER', KEYS[1], ARGV[2])
  if exists == 1 then return -1 end
  local count = redis.call('SCARD', KEYS[1])
  if count >= tonumber(ARGV[1]) then return 0 end
  redis.call('SADD', KEYS[1], ARGV[2])
  return 1
`;

@WebSocketGateway({
  namespace: 'game',
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayDisconnect {
  constructor(
    private readonly jwtService: CustomJwtService,
    private readonly redis: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  async handleJoinRoom(client: any, payload: { roomId: string; jwt: string }) {
    const { roomId, jwt } = payload;

    if (!roomId || !jwt) {
      client.emit('join_error', { message: 'roomId 또는 jwt가 필요합니다.' });
      return;
    }

    const trimmedRoomId = roomId.trim();
    const key = `room:${trimmedRoomId}`;
    const membersKey = `room:${trimmedRoomId}:members`;

    // 방 존재 확인
    const room = await this.redis.client.hgetall(key);
    if (Object.keys(room).length === 0) {
      client.emit('join_error', { message: '존재하지 않는 방입니다.' });
      return;
    }

    // 게임 진행 중이면 입장 차단
    if (room.status === 'PLAYING') {
      client.emit('join_error', { message: '게임이 진행 중인 방입니다.' });
      return;
    }

    // JWT 검증
    const tokenResult = await this.jwtService.verifyJwt(jwt);
    if (!tokenResult) {
      client.emit('join_error', { message: '토큰이 유효하지 않습니다.' });
      return;
    }

    const maxPlayers = Number(room.maxPlayers);
    const nickname = tokenResult.nickname;

    // 원자적 정원 체크 + Set 추가 (Lua 스크립트)
    const added = (await this.redis.client.eval(
      LUA_ADD_MEMBER,
      1,
      membersKey,
      maxPlayers.toString(),
      nickname,
    )) as number;

    if (added === -1) {
      client.emit('join_error', { message: '이미 사용 중인 닉네임입니다.' });
      return;
    }

    if (added === 0) {
      client.emit('join_error', { message: '방이 가득 찼습니다.' });
      return;
    }

    // players 카운트를 Set 크기로 동기화
    const currentCount = await this.redis.client.scard(membersKey);
    await this.redis.client.hset(key, 'players', currentCount);

    // members Set TTL을 방 TTL에 맞춤
    const ttl = await this.redis.client.ttl(key);
    if (ttl > 0) await this.redis.client.expire(membersKey, ttl);

    // client 상태 저장 및 소켓 룸 입장
    client.data.roomId = trimmedRoomId;
    client.data.nickname = nickname;
    client.join(trimmedRoomId);

    // 전체 멤버 목록 조회
    const members = await this.redis.client.smembers(membersKey);

    // 본인에게 (현재 멤버 목록 포함)
    client.emit('join_success', {
      roomId: trimmedRoomId,
      nickname,
      socketId: client.id,
      members,
      maxPlayers,
    });

    // 다른 사람들에게 (업데이트된 멤버 목록 포함)
    client.to(trimmedRoomId).emit('user_joined', {
      socketId: client.id,
      nickname,
      members,
    });

    return { connected: true, roomId: trimmedRoomId };
  }

  @SubscribeMessage('chat')
  handleChat(client: any, payload: { message: string }) {
    const roomId = client.data.roomId;
    const nickname = client.data.nickname;

    if (!roomId) {
      console.log('roomId 없음 -> 전송 안함');
      return;
    }

    const chatData = {
      nickname,
      message: payload.message,
      socketId: client.id,
      time: new Date().toISOString(),
    };

    console.log('emit 보냄:', chatData);
    this.server.to(roomId).emit('chat_message', chatData);
  }

  @SubscribeMessage('game_start')
  async handleGameStart(client: any) {
    const roomId = client.data.roomId;

    if (!roomId) {
      client.emit('game_error', { message: '방에 속해있지 않습니다.' });
      return;
    }

    const sockets = await this.server.in(roomId).fetchSockets();

    if (sockets.length < 2) {
      this.server.to(roomId).emit('game_error', {
        message: '최소 2명 이상 필요합니다.',
      });
      return;
    }

    const randomCategory =
      ResultCategory[Math.floor(Math.random() * ResultCategory.length)];
    const randomAnswer =
      randomCategory.keyword[
        Math.floor(Math.random() * randomCategory.keyword.length)
      ];
    const randomPlayer = sockets[Math.floor(Math.random() * sockets.length)];
    const liarSocketId = randomPlayer.id;

    for (const socket of sockets) {
      if (socket.id === liarSocketId) {
        socket.emit('game_info', {
          role: 'liar',
          category: randomCategory.category,
        });
      } else {
        socket.emit('game_info', {
          role: 'citizen',
          answer: randomAnswer,
        });
      }
    }

    // Redis 상태 업데이트 (PLAYING, TTL 1시간)
    const key = `room:${roomId}`;
    const membersKey = `room:${roomId}:members`;
    await this.redis.client.hset(key, {
      status: 'PLAYING',
      liarNickname: randomPlayer.data.nickname,
      answer: randomAnswer,
      category: randomCategory.category,
    });
    await this.redis.client.expire(key, 3600);
    await this.redis.client.expire(membersKey, 3600);

    this.server.to(roomId).emit('game_started', {
      message: '게임이 시작되었습니다.',
    });

    console.log('게임 시작');
  }

  @SubscribeMessage('game_end')
  async handleGameEnd(client: any) {
    const roomId = client.data.roomId;

    if (!roomId) {
      client.emit('game_error', { message: '방에 속해있지 않습니다.' });
      return;
    }

    const key = `room:${roomId}`;
    const membersKey = `room:${roomId}:members`;

    const liarNickname = await this.redis.client.hget(key, 'liarNickname');
    const answer = await this.redis.client.hget(key, 'answer');
    const category = await this.redis.client.hget(key, 'category');

    await this.redis.client.hset(key, 'status', 'END');
    await this.redis.client.expire(key, 1800);
    await this.redis.client.expire(membersKey, 1800);

    this.server.to(roomId).emit('game_ended', {
      liarNickname,
      answer,
      category,
    });

    console.log('게임 종료');
  }

  async handleDisconnect(client: Socket) {
    console.log('연결 끊김:', client.id);

    const roomId = client.data.roomId;
    const nickname = client.data.nickname;

    if (!roomId) {
      console.log('roomId 없음 → 처리 안함');
      return;
    }

    const key = `room:${roomId}`;
    const membersKey = `room:${roomId}:members`;

    try {
      const room = await this.redis.client.hgetall(key);
      if (Object.keys(room).length === 0) {
        console.log('이미 삭제된 방');
        return;
      }

      // Set에서 멤버 제거
      await this.redis.client.srem(membersKey, nickname);

      // players 카운트를 Set 크기로 동기화
      const currentCount = await this.redis.client.scard(membersKey);
      await this.redis.client.hset(key, 'players', currentCount);

      console.log(`현재 인원: ${currentCount}`);

      // 업데이트된 멤버 목록
      const members = await this.redis.client.smembers(membersKey);

      // 남은 사람들에게 알림 (업데이트된 멤버 목록 포함)
      client.to(roomId).emit('user_left', {
        socketId: client.id,
        nickname,
        members,
      });

      // 인원 0명이면 방과 Set 모두 삭제
      if (currentCount <= 0) {
        await this.redis.client.del(key);
        await this.redis.client.del(membersKey);
        console.log('🗑 방 삭제됨');
      }
    } catch (err) {
      console.error('disconnect 처리 중 에러:', err);
    }
  }
}
