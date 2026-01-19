import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('create')
  @HttpCode(HttpStatus.OK)
  createRoom() {
    return this.roomService.createRoom();
  }

  @Get('join')
  @HttpCode(HttpStatus.OK)
  joinRoom(@Query('roomId') roomId: string) {
    return this.roomService.joinRoom(roomId);
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
