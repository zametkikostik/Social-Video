import { Controller, Get, Post, Body, UseGuards, Request, Req, Headers } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('compliance')
export class ComplianceController {
  constructor(private compliance: ComplianceService) {}

  @Get('policy')
  policy() {
    return this.compliance.policyMeta();
  }

  @Post('consent')
  async consent(@Body() body: any, @Req() req: any, @Headers('user-agent') ua?: string) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    return this.compliance.recordConsent({
      userId: req.user?.id,
      analytics: !!body.analytics,
      marketing: !!body.marketing,
      preferences: !!body.preferences,
      region: body.region,
      ip,
      userAgent: ua,
    });
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  export(@Request() req: any) {
    return this.compliance.exportUserData(req.user.id);
  }

  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req: any) {
    await this.compliance.requestDataAction(req.user.id, 'DELETE');
    await this.compliance.anonymizeUser(req.user.id);
    return { ok: true };
  }

  @Post('data-request')
  @UseGuards(JwtAuthGuard)
  dataRequest(@Body() body: { type: 'EXPORT' | 'DELETE' | 'RECTIFY'; note?: string }, @Request() req: any) {
    return this.compliance.requestDataAction(req.user.id, body.type, body.note);
  }
}
