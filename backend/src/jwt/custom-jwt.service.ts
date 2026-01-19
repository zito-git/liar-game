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

  async verifyJwt(token: string) {
    try {
      const result = token.split(' ');
      return await this.jwtService.verifyAsync(result[1]);
    } catch {
      return null;
    }
  }
}
