import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CustomJwtService {
  constructor(private readonly jwtService: JwtService) {}

  async createJwt(nickname: string) {
    const payload = { nickname };
    const result = await this.jwtService.signAsync(payload);

    return 'Bearer ' + result;
  }
}
