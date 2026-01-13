import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { RedisService } from 'src/redis/redis.service';

@WebSocketGateway(80, { namespace: 'game', transports: ['websocket'] })
export class GameGateway {
  constructor(private readonly redis: RedisService) {}

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}
