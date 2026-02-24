import { ApiProperty } from '@nestjs/swagger';

export class JoinRoomDto {
  @ApiProperty({
    example: '4d90dc3a-ca7f-44ab-b5a1-f4c8a2fb5c3b',
    description: '입장할 방 ID',
  })
  roomId: string;

  @ApiProperty({
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: '사용자 JWT 토큰',
  })
  jwtToken: string;
}

export class CreateNicknameDto {
  @ApiProperty({
    example: 'testuser01',
    description: '사용할 닉네임',
  })
  nickname: string;
}
