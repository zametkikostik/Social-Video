import {
  Controller, Get, Post, Body, Req, UseGuards, Request, Headers, HttpCode,
} from '@nestjs/common';
import { PaymentsService, PaymentProviderId } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get('providers')
  providers() {
    return this.payments.availableProviders();
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(
    @Body()
    body: {
      toUserId: string;
      amount: number;
      currency?: string;
      message?: string;
      videoId?: string;
      channelId?: string;
      provider: PaymentProviderId;
      chainId?: string;
      fromAddress?: string;
    },
    @Request() req: any,
  ) {
    return this.payments.createCheckout({ fromUserId: req.user.id, ...body });
  }

  @Post('web3/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmWeb3(
    @Body() body: { tipId: string; txHash: string; fromAddress?: string },
    @Request() req: any,
  ) {
    return this.payments.confirmWeb3(body.tipId, req.user.id, body.txHash, body.fromAddress);
  }

  @Post('payout-settings')
  @UseGuards(JwtAuthGuard)
  async payoutSettings(
    @Body() body: { payoutAddress?: string; yoomoneyWallet?: string; payeerAccount?: string },
    @Request() req: any,
  ) {
    return this.payments.setPayoutSettings(req.user.id, body);
  }

  @Post('webhooks/stripe')
  @HttpCode(200)
  async stripeWebhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.payments.handleStripeWebhook(Buffer.isBuffer(raw) ? raw : Buffer.from(raw), signature || '');
  }

  @Post('webhooks/yoomoney')
  @HttpCode(200)
  async yoomoneyWebhook(@Body() body: Record<string, string>) {
    return this.payments.handleYooMoneyNotify(body);
  }

  @Post('webhooks/payeer')
  @HttpCode(200)
  async payeerWebhook(@Body() body: Record<string, string>) {
    return this.payments.handlePayeerNotify(body);
  }

  @Post('webhooks/cryptobot')
  @HttpCode(200)
  async cryptobotWebhook(@Body() body: any) {
    return this.payments.handleCryptoBotWebhook(body);
  }
}
