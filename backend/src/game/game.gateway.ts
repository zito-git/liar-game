import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { CustomJwtService } from 'src/jwt/custom-jwt.service';

@WebSocketGateway(80, {
  namespace: 'game',
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  constructor(private readonly jwtService: CustomJwtService) {}
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  async handleJoinRoom(client: any, payload: any) {
    const jwt: string = client.handshake.headers.authorization;
    const roomId: string = payload.roomId;

    //jwt 검증
    const tokenResult = await this.jwtService.verifyJwt(jwt);
    if (!tokenResult) {
      return 'Error';
    }

    // client 상태 저장
    client.data.roomId = roomId;
    client.data.nickname = tokenResult.nickname;

    //방 접속하기
    client.join(roomId);

    console.log(client.id);
    //본인에게만
    client.emit('join_success', {
      roomId,
      nickname: tokenResult.nickname,
      socketId: client.id,
    });

    //방 다른 사람들에게
    client.to(roomId).emit('user_joined', {
      socketId: client.id,
      nickname: tokenResult.nickname,
    });

    const result = { connected: true, roomId };
    return result;
  }
}
