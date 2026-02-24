import { ApiProperty } from '@nestjs/swagger';

export class JoinRoomDto {
  @ApiProperty({
    example: 'room-1234',
    description: '입장할 방 ID',
  })
  roomId: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: '사용자 JWT 토큰',
  })
  jwtToken: string;
}

export class CreateNicknameDto {
  @ApiProperty({
    example: 'junseo',
    description: '사용할 닉네임',
  })
  nickname: string;
}
