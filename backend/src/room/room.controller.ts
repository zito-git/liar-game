import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('create')
  @HttpCode(HttpStatus.OK)
  createRoom() {
    return this.roomService.createRoom();
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  joinRoom(@Body('roomId') roomId: string, jwtToken: string) {
    return this.roomService.joinRoom(roomId, jwtToken);
  }

  @Get('quit')
  @HttpCode(HttpStatus.OK)
  quitRoom(@Query('roomId') roomId: string) {
    return this.roomService.quitRoom(roomId);
  }

  @Get('nickname')
  @HttpCode(HttpStatus.OK)
  createNickname(@Query('id') nickname: string) {
    return this.roomService.createNickname(nickname);
  }
}
