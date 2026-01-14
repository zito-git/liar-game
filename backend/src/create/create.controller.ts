import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateService } from './create.service';

@Controller('create')
export class CreateController {
  constructor(private readonly createService: CreateService) {}

  @Get('room')
  @HttpCode(HttpStatus.OK)
  createRoom() {
    return this.createService.createRoom();
  }
}
