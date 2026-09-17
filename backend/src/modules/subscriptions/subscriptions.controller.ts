import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post('channels/:channelId/subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Param('channelId') channelId: string, @Request() req: any) {
    return this.subscriptionsService.subscribe(channelId, req.user.id);
  }

  @Delete('channels/:channelId/subscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Param('channelId') channelId: string, @Request() req: any) {
    return this.subscriptionsService.unsubscribe(channelId, req.user.id);
  }

  @Post('channels/:channelId/subscribe/toggle')
  @UseGuards(JwtAuthGuard)
  async toggle(@Param('channelId') channelId: string, @Request() req: any) {
    return this.subscriptionsService.toggle(channelId, req.user.id);
  }

  @Get('channels/:channelId/subscribe/me')
  @UseGuards(JwtAuthGuard)
  async isSubscribed(@Param('channelId') channelId: string, @Request() req: any) {
    const subscribed = await this.subscriptionsService.isSubscribed(channelId, req.user.id);
    return { subscribed };
  }

  @Get('subscriptions/me')
  @UseGuards(JwtAuthGuard)
  async mySubscriptions(@Request() req: any) {
    return this.subscriptionsService.listMySubscriptions(req.user.id);
  }
}
