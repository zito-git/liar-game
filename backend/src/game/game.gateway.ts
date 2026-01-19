import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway(80, {
  namespace: 'game',
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}
