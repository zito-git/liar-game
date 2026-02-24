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

@WebSocketGateway(80, {
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
      client.emit('join_error', {
        message: 'roomId 또는 jwt가 필요합니다.',
      });
      return;
    }

    const trimmedRoomId = roomId.trim();
    const key = `room:${trimmedRoomId}`;

    // 방 존재 확인
    const room = await this.redis.client.hgetall(key);
    if (Object.keys(room).length === 0) {
      client.emit('join_error', {
        message: '존재하지 않는 방입니다.',
      });
      return;
    }

    // JWT 검증
    const tokenResult = await this.jwtService.verifyJwt(jwt);
    if (!tokenResult) {
      client.emit('join_error', {
        message: '토큰이 유효하지 않습니다.',
      });
      return;
    }

    // Redis 인원 증가 (안전하게 하려면 여기서 max 체크 추가 가능)
    await this.redis.client.hincrby(key, 'players', 1);

    // client 상태 저장
    client.data.roomId = trimmedRoomId;
    client.data.nickname = tokenResult.nickname;

    // 소켓 룸 입장
    client.join(trimmedRoomId);

    // 본인에게
    client.emit('join_success', {
      roomId: trimmedRoomId,
      nickname: tokenResult.nickname,
      socketId: client.id,
    });

    // 다른 사람들에게
    client.to(trimmedRoomId).emit('user_joined', {
      socketId: client.id,
      nickname: tokenResult.nickname,
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

    // 방에 있는 소켓들 가져오기
    const sockets = await this.server.in(roomId).fetchSockets();

    if (sockets.length < 2) {
      this.server.to(roomId).emit('game_error', {
        message: '최소 2명 이상 필요합니다.',
      });
      return;
    }

    //  랜덤 카테고리 선택
    const randomCategory =
      ResultCategory[Math.floor(Math.random() * ResultCategory.length)];

    //  랜덤 정답 1개 선택
    const randomAnswer =
      randomCategory.keyword[
        Math.floor(Math.random() * randomCategory.keyword.length)
      ];

    //  방 인원 중 1명 랜덤 선택
    const randomPlayer = sockets[Math.floor(Math.random() * sockets.length)];

    const liarSocketId = randomPlayer.id;

    //  각 유저에게 다르게 전송
    for (const socket of sockets) {
      if (socket.id === liarSocketId) {
        // 이 사람은 카테고리만 받음
        socket.emit('game_info', {
          role: 'liar',
          category: randomCategory.category,
        });
      } else {
        // 나머지는 정답만 받음
        socket.emit('game_info', {
          role: 'citizen',
          answer: randomAnswer,
        });
      }
    }

    // 방 전체에 게임 시작 알림
    this.server.to(roomId).emit('game_started', {
      message: '게임이 시작되었습니다.',
    });

    console.log('게임 시작');
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

    try {
      // 방 존재 확인
      const room = await this.redis.client.hgetall(key);

      if (Object.keys(room).length === 0) {
        console.log('이미 삭제된 방');
        return;
      }

      // 인원 감소
      await this.redis.client.hincrby(key, 'players', -1);

      const players = Number(await this.redis.client.hget(key, 'players'));
      const maxPlayers = room.maxPlayers;

      console.log(`현재 인원: ${players}`);

      // 방에 남은 사람들에게 알림
      client.to(roomId).emit('user_left', {
        socketId: client.id,
        nickname,
      });

      // 인원 0명이면 방 삭제
      if (players <= 0) {
        await this.redis.client.del(key);
        console.log('🗑 방 삭제됨');
      }
    } catch (err) {
      console.error('disconnect 처리 중 에러:', err);
    }
  }
}
