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
import { CreateNicknameDto, JoinRoomDto } from './dto/room.req.dto';
import {
  CreateNicknameResponseDto,
  CreateRoomResponseDto,
  JoinRoomResponseDto,
  QuitRoomResponseDto,
} from './dto/room.res.dto';

@ApiTags('Room')
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '방 생성' })
  @ApiResponse({
    status: 201,
    description: '방 생성 성공',
    type: CreateRoomResponseDto,
  })
  createRoom(): Promise<CreateRoomResponseDto> {
    return this.roomService.createRoom();
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '방 참가' })
  @ApiBody({ type: JoinRoomDto })
  @ApiResponse({
    status: 200,
    description: '방 참가 성공',
    type: JoinRoomResponseDto,
  })
  joinRoom(@Body() body: JoinRoomDto): Promise<JoinRoomResponseDto> {
    return this.roomService.joinRoom(body.roomId, body.jwtToken);
  }

  @Delete('quit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '방 나가기' })
  @ApiQuery({
    name: 'roomId',
    required: true,
    description: '4d90dc3a-ca7f-44ab-b5a1-f4c8a2fb5c3b',
    example: 'room-1234',
  })
  @ApiResponse({
    status: 200,
    description: '방 나가기 성공',
    type: QuitRoomResponseDto,
  })
  quitRoom(@Query('roomId') roomId: string): Promise<QuitRoomResponseDto> {
    return this.roomService.quitRoom(roomId);
  }

  @Post('nickname')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '닉네임 생성' })
  @ApiBody({ type: CreateNicknameDto })
  @ApiResponse({
    status: 200,
    description: '닉네임 생성 성공',
    type: CreateNicknameResponseDto,
  })
  createNickname(
    @Body() body: CreateNicknameDto,
  ): Promise<CreateNicknameResponseDto> {
    return this.roomService.createNickname(body.nickname);
  }
}
