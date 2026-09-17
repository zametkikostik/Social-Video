import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Request() req: any,
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.list(
      req.user.id,
      parseInt(limit, 10),
      parseInt(offset, 10),
      unread === '1' || unread === 'true',
    );
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notificationsService.unreadCount(req.user.id);
    return { count };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Post('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.remove(id, req.user.id);
  }
}
