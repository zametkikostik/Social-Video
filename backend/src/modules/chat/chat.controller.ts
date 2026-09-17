import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('live')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get(':streamId/chat')
  async history(
    @Param('streamId') streamId: string,
    @Query('limit') limit = '50',
  ) {
    return this.chatService.history(streamId, parseInt(limit, 10));
  }
}
