import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { RoomService } from './room.service';
import { CreateNicknameDto, JoinRoomDto } from './interface';

@ApiTags('Room')
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '방 생성' })
  @ApiResponse({ status: 201, description: '방 생성 성공' })
  createRoom() {
    return this.roomService.createRoom();
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '방 참가' })
  @ApiBody({ type: JoinRoomDto })
  @ApiResponse({ status: 200, description: '방 참가 성공' })
  joinRoom(@Body() body: JoinRoomDto) {
    return this.roomService.joinRoom(body.roomId, body.jwtToken);
  }

  @Delete('quit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '방 나가기' })
  @ApiQuery({
    name: 'roomId',
    required: true,
    description: '나갈 방 ID',
    example: 'room-1234',
  })
  @ApiResponse({ status: 200, description: '방 나가기 성공' })
  quitRoom(@Query('roomId') roomId: string) {
    return this.roomService.quitRoom(roomId);
  }

  @Post('nickname')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '닉네임 생성' })
  @ApiBody({ type: CreateNicknameDto })
  @ApiResponse({ status: 200, description: '닉네임 생성 성공' })
  createNickname(@Body() body: CreateNicknameDto) {
    return this.roomService.createNickname(body.nickname);
  }
}
