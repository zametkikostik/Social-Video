import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FederationService } from './federation.service';

@Controller()
export class FederationController {
  constructor(private federation: FederationService) {}

  @Get('.well-known/webfinger')
  @Header('Content-Type', 'application/jrd+json')
  async webfinger(@Query('resource') resource: string) {
    return this.federation.webfinger(resource);
  }

  @Get('.well-known/nodeinfo')
  async nodeInfoIndex() {
    return this.federation.nodeInfoWellKnown();
  }

  @Get('ap/nodeinfo/2.1')
  async nodeInfo() {
    return this.federation.nodeInfo();
  }

  @Get('ap/channels/:slug')
  async channelActor(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Type', 'application/activity+json');
    return this.federation.getChannelActor(slug);
  }

  @Get('ap/users/:username')
  async userActor(
    @Param('username') username: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Type', 'application/activity+json');
    return this.federation.getUserActor(username);
  }

  @Get('ap/channels/:slug/outbox')
  async outbox(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    res?.setHeader('Content-Type', 'application/activity+json');
    return this.federation.channelOutbox(
      slug,
      page ? parseInt(page, 10) : undefined,
    );
  }

  @Get('ap/channels/:slug/followers')
  async followers(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Type', 'application/activity+json');
    return this.federation.channelFollowers(slug);
  }

  @Get('ap/channels/:slug/following')
  async following(@Param('slug') slug: string) {
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: this.federation.channelActorId(slug) + '/following',
      type: 'OrderedCollection',
      totalItems: 0,
      orderedItems: [],
    };
  }

  @Get('ap/videos/:id')
  async videoObject(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Type', 'application/activity+json');
    return this.federation.getVideoObject(id);
  }

  @Post('ap/channels/:slug/inbox')
  async inbox(@Param('slug') slug: string, @Body() body: any) {
    return this.federation.handleInbox(slug, body);
  }

  @Post('ap/sharedInbox')
  async sharedInbox(@Body() body: any) {
    return this.federation.handleSharedInbox(body);
  }
}
