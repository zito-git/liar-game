import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { CustomJwtModule } from 'src/jwt/custom-jwt.module';

@Module({
  imports: [CustomJwtModule],
  providers: [GameGateway],
})
export class GameModule {}
