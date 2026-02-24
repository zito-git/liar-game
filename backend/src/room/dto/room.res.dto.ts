import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomResponseDto {
  @ApiProperty({
    example: '4d90dc3a-ca7f-44ab-b5a1-f4c8a2fb5c3b',
    description: '생성된 방 ID',
  })
  roomId: string;
}

export class JoinRoomResponseDto {
  @ApiProperty({
    example: '4d90dc3a-ca7f-44ab-b5a1-f4c8a2fb5c3b',
    description: '방 ID',
  })
  roomId: string;

  @ApiProperty({ example: true, description: '방 참가 성공 여부' })
  roomJoin: boolean;

  @ApiProperty({ example: 2, description: '현재 방 인원 수' })
  players: number;

  @ApiProperty({ example: 4, description: '방 최대 인원 수' })
  maxPlayers: number;
}

export class QuitRoomResponseDto {
  @ApiProperty({ example: false, description: '방 삭제 여부' })
  roomDeleted: boolean;

  @ApiProperty({
    example: '4d90dc3a-ca7f-44ab-b5a1-f4c8a2fb5c3b',
    description: '방 ID',
    required: false,
  })
  roomId?: string; // 삭제되면 없을 수도 있음

  @ApiProperty({ example: 2, description: '현재 방 인원 수' })
  players: number;

  @ApiProperty({ example: 4, description: '방 최대 인원 수', required: false })
  maxPlayers: number;
}

export class CreateNicknameResponseDto {
  @ApiProperty({ example: 'helloTest01', description: '생성된 닉네임' })
  nickname: string;

  @ApiProperty({
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...',
    description: '생성된 jwt 토큰',
  })
  Authorization: string;
}
