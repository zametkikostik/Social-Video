import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async stats() {
    return this.adminService.stats();
  }

  @Get('users')
  @Roles('ADMIN')
  async users(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
    @Query('q') q?: string,
  ) {
    return this.adminService.listUsers(
      parseInt(limit, 10),
      parseInt(offset, 10),
      q,
    );
  }

  @Patch('users/:id/role')
  @Roles('ADMIN')
  async setRole(
    @Param('id') id: string,
    @Body() body: { role: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' },
  ) {
    return this.adminService.setUserRole(id, body.role);
  }

  @Patch('users/:id/verify')
  async setVerified(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
  ) {
    return this.adminService.setVerified(id, body.isVerified);
  }

  @Get('moderation/videos')
  async moderationVideos(
    @Query('status') status?: string,
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
  ) {
    return this.adminService.listVideosForModeration(
      status,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Post('moderation/videos/:id')
  async moderateVideo(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REJECT' | 'QUARANTINE'; reason?: string },
    @Request() req: any,
  ) {
    return this.adminService.moderateVideo(
      id,
      body.action,
      body.reason,
      req.user.id,
    );
  }

  @Post('videos/:id/delete')
  @Roles('ADMIN')
  async deleteVideo(@Param('id') id: string) {
    return this.adminService.deleteVideo(id);
  }

  @Get('moderation/logs')
  async logs(@Query('limit') limit = '40') {
    return this.adminService.listRecentLogs(parseInt(limit, 10));
  }
}
