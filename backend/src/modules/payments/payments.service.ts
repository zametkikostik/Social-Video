import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type PaymentProviderId =
  | 'INTERNAL'
  | 'STRIPE'
  | 'WEB3'
  | 'YOOMONEY'
  | 'PAYEER'
  | 'CRYPTOBOT';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  availableProviders() {
    return {
      INTERNAL: true,
      WEB3: true,
      STRIPE: !!(this.config.get('STRIPE_SECRET_KEY') && this.config.get('STRIPE_WEBHOOK_SECRET')),
      YOOMONEY: !!(this.config.get('YOOMONEY_WALLET') && this.config.get('YOOMONEY_SECRET')),
      PAYEER: !!(this.config.get('PAYEER_MERCHANT_ID') && this.config.get('PAYEER_SECRET')),
      CRYPTOBOT: !!this.config.get('CRYPTOBOT_TOKEN'),
    };
  }

  async createCheckout(data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency?: string;
    message?: string;
    videoId?: string;
    channelId?: string;
    provider: PaymentProviderId;
    chainId?: string;
    fromAddress?: string;
  }) {
    if (data.amount < 100 && data.provider !== 'WEB3') {
      throw new BadRequestException('Minimum amount is 100 minor units');
    }
    if (data.fromUserId === data.toUserId) {
      throw new BadRequestException('Cannot tip yourself');
    }

    const receiver = await this.prisma.user.findUnique({ where: { id: data.toUserId } });
    if (!receiver) throw new NotFoundException('Receiver not found');

    const currency = (data.currency || 'USD').toUpperCase();
    const available = this.availableProviders();
    if (!available[data.provider]) {
      throw new BadRequestException(`Provider ${data.provider} is not configured`);
    }

    let toUserId = data.toUserId;
    if (data.videoId) {
      const video = await this.prisma.video.findUnique({ where: { id: data.videoId } });
      if (!video) throw new NotFoundException('Video not found');
      toUserId = video.uploaderId;
    }

    const externalId = `tip_${randomBytes(12).toString('hex')}`;

    if (data.provider === 'INTERNAL') {
      const tip = await this.prisma.tip.create({
        data: {
          amount: data.amount,
          currency,
          message: data.message?.slice(0, 300),
          status: 'COMPLETED',
          provider: 'INTERNAL',
          paymentRef: `sim_${Date.now()}`,
          externalId,
          fromUserId: data.fromUserId,
          toUserId,
          videoId: data.videoId,
          channelId: data.channelId,
        },
      });
      await this.notifyTip(tip, data.message);
      return { tip, checkoutUrl: null, web3: null };
    }

    if (data.provider === 'WEB3') {
      const toAddress = receiver.payoutAddress || this.config.get('WEB3_TREASURY_ADDRESS');
      if (!toAddress) {
        throw new BadRequestException('Creator has no payout wallet');
      }
      const chainId = data.chainId || this.config.get('WEB3_DEFAULT_CHAIN') || '137';
      const tip = await this.prisma.tip.create({
        data: {
          amount: data.amount,
          currency: currency === 'USD' ? 'USDC' : currency,
          message: data.message?.slice(0, 300),
          status: 'PENDING',
          provider: 'WEB3',
          externalId,
          chainId,
          toAddress,
          fromAddress: data.fromAddress,
          fromUserId: data.fromUserId,
          toUserId,
          videoId: data.videoId,
          channelId: data.channelId,
        },
      });
      return {
        tip,
        checkoutUrl: null,
        web3: {
          chainId,
          toAddress,
          amount: data.amount,
          currency: tip.currency,
          tipId: tip.id,
          externalId,
          tokens: this.web3TokenHints(chainId),
        },
      };
    }

    if (data.provider === 'STRIPE') return this.createStripeCheckout({ ...data, toUserId, currency, externalId });
    if (data.provider === 'YOOMONEY') return this.createYooMoneyCheckout({ ...data, toUserId, currency, externalId });
    if (data.provider === 'PAYEER') return this.createPayeerCheckout({ ...data, toUserId, currency, externalId });
    if (data.provider === 'CRYPTOBOT') return this.createCryptoBotInvoice({ ...data, toUserId, currency, externalId });

    throw new BadRequestException('Unknown provider');
  }

  private web3TokenHints(chainId: string) {
    const map: Record<string, { symbol: string; address: string; decimals: number }[]> = {
      '1': [
        { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      ],
      '137': [
        { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
        { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      ],
      '56': [
        { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
        { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      ],
      '8453': [{ symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }],
    };
    return map[chainId] || map['137'];
  }

  async confirmWeb3(tipId: string, userId: string, txHash: string, fromAddress?: string) {
    const tip = await this.prisma.tip.findUnique({ where: { id: tipId } });
    if (!tip) throw new NotFoundException('Tip not found');
    if (tip.fromUserId !== userId) throw new BadRequestException('Not your tip');
    if (tip.provider !== 'WEB3') throw new BadRequestException('Not a web3 tip');
    if (tip.status === 'COMPLETED') return tip;
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new BadRequestException('Invalid txHash');

    const updated = await this.prisma.tip.update({
      where: { id: tipId },
      data: {
        status: 'COMPLETED',
        txHash,
        fromAddress: fromAddress || tip.fromAddress,
        paymentRef: txHash,
      },
    });
    await this.notifyTip(updated);
    return updated;
  }

  private async createStripeCheckout(data: any) {
    const secret = this.config.get('STRIPE_SECRET_KEY');
    const appUrl = this.config.get('APP_URL') || 'http://localhost:3000';
    const tip = await this.prisma.tip.create({
      data: {
        amount: data.amount,
        currency: data.currency.toLowerCase(),
        message: data.message?.slice(0, 300),
        status: 'PENDING',
        provider: 'STRIPE',
        externalId: data.externalId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        videoId: data.videoId,
        channelId: data.channelId,
      },
    });
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${appUrl}/tips?paid=1&tip=${tip.id}`);
    params.append('cancel_url', `${appUrl}/tips?canceled=1`);
    params.append('client_reference_id', tip.id);
    params.append('metadata[tipId]', tip.id);
    params.append('line_items[0][price_data][currency]', data.currency.toLowerCase());
    params.append('line_items[0][price_data][unit_amount]', String(data.amount));
    params.append('line_items[0][price_data][product_data][name]', 'Social-Video Tip');
    params.append('line_items[0][quantity]', '1');
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      await this.prisma.tip.update({ where: { id: tip.id }, data: { status: 'FAILED' } });
      throw new BadRequestException('Stripe checkout failed');
    }
    const session = await res.json();
    await this.prisma.tip.update({
      where: { id: tip.id },
      data: { externalId: session.id, checkoutUrl: session.url, paymentRef: session.id },
    });
    return { tip: { ...tip, checkoutUrl: session.url }, checkoutUrl: session.url, web3: null };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    if (!signature) throw new BadRequestException('Missing signature');
    const event = JSON.parse(rawBody.toString());
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tipId = session.metadata?.tipId || session.client_reference_id;
      if (tipId) await this.completeTip(tipId, session.id);
    }
    return { received: true };
  }

  private async createYooMoneyCheckout(data: any) {
    const wallet = this.config.get('YOOMONEY_WALLET');
    const appUrl = this.config.get('APP_URL') || 'http://localhost:3000';
    const sum = (data.amount / 100).toFixed(2);
    const tip = await this.prisma.tip.create({
      data: {
        amount: data.amount,
        currency: 'RUB',
        message: data.message?.slice(0, 300),
        status: 'PENDING',
        provider: 'YOOMONEY',
        externalId: data.externalId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        videoId: data.videoId,
        channelId: data.channelId,
      },
    });
    const params = new URLSearchParams({
      receiver: wallet,
      'quickpay-form': 'button',
      targets: `Tip ${tip.id}`,
      paymentType: 'PC',
      sum,
      label: tip.id,
      successURL: `${appUrl}/tips?paid=1&tip=${tip.id}`,
    });
    const checkoutUrl = `https://yoomoney.ru/quickpay/confirm.xml?${params}`;
    await this.prisma.tip.update({ where: { id: tip.id }, data: { checkoutUrl } });
    return { tip: { ...tip, checkoutUrl }, checkoutUrl, web3: null };
  }

  async handleYooMoneyNotify(body: Record<string, string>) {
    const secret = this.config.get('YOOMONEY_SECRET');
    const str = [
      body.notification_type, body.operation_id, body.amount, body.currency,
      body.datetime, body.sender, body.codepro, secret, body.label,
    ].join('&');
    const hash = createHash('sha1').update(str).digest('hex');
    if (hash !== body.sha1_hash) throw new BadRequestException('Invalid YooMoney signature');
    if (body.label) await this.completeTip(body.label, body.operation_id);
    return { ok: true };
  }

  private async createPayeerCheckout(data: any) {
    const m_shop = this.config.get('PAYEER_MERCHANT_ID');
    const secret = this.config.get('PAYEER_SECRET');
    const appUrl = this.config.get('APP_URL') || 'http://localhost:3000';
    const m_orderid = data.externalId;
    const m_amount = (data.amount / 100).toFixed(2);
    const m_curr = data.currency === 'RUB' ? 'RUB' : data.currency === 'EUR' ? 'EUR' : 'USD';
    const m_desc = Buffer.from('Tip').toString('base64');
    const tip = await this.prisma.tip.create({
      data: {
        amount: data.amount,
        currency: m_curr,
        message: data.message?.slice(0, 300),
        status: 'PENDING',
        provider: 'PAYEER',
        externalId: m_orderid,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        videoId: data.videoId,
        channelId: data.channelId,
      },
    });
    const signStr = [m_shop, m_orderid, m_amount, m_curr, m_desc, secret].join(':');
    const m_sign = createHash('sha256').update(signStr).digest('hex').toUpperCase();
    const params = new URLSearchParams({
      m_shop, m_orderid, m_amount, m_curr, m_desc, m_sign,
      m_success_url: `${appUrl}/tips?paid=1&tip=${tip.id}`,
      m_fail_url: `${appUrl}/tips?canceled=1`,
    });
    const checkoutUrl = `https://payeer.com/merchant/?${params}`;
    await this.prisma.tip.update({ where: { id: tip.id }, data: { checkoutUrl } });
    return { tip: { ...tip, checkoutUrl }, checkoutUrl, web3: null };
  }

  async handlePayeerNotify(body: Record<string, string>) {
    const secret = this.config.get('PAYEER_SECRET');
    if (body.m_status !== 'success') return { ok: false };
    const signStr = [
      body.m_operation_id, body.m_operation_ps, body.m_operation_date,
      body.m_operation_pay_date, body.m_shop, body.m_orderid, body.m_amount,
      body.m_curr, body.m_desc, body.m_status, secret,
    ].join(':');
    const check = createHash('sha256').update(signStr).digest('hex').toUpperCase();
    if (check !== body.m_sign) throw new BadRequestException('Invalid Payeer sign');
    const tip = await this.prisma.tip.findFirst({ where: { externalId: body.m_orderid } });
    if (tip) await this.completeTip(tip.id, body.m_operation_id);
    return { ok: true };
  }

  private async createCryptoBotInvoice(data: any) {
    const token = this.config.get('CRYPTOBOT_TOKEN');
    const tip = await this.prisma.tip.create({
      data: {
        amount: data.amount,
        currency: data.currency,
        message: data.message?.slice(0, 300),
        status: 'PENDING',
        provider: 'CRYPTOBOT',
        externalId: data.externalId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        videoId: data.videoId,
        channelId: data.channelId,
      },
    });
    const res = await fetch('https://pay.crypt.bot/api/createInvoice', {
      method: 'POST',
      headers: { 'Crypto-Pay-API-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency_type: 'fiat',
        fiat: data.currency === 'RUB' ? 'RUB' : 'USD',
        amount: (data.amount / 100).toFixed(2),
        description: data.message || 'Social-Video tip',
        payload: tip.id,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      await this.prisma.tip.update({ where: { id: tip.id }, data: { status: 'FAILED' } });
      throw new BadRequestException('CryptoBot failed');
    }
    const invoice = json.result;
    const checkoutUrl = invoice.pay_url || invoice.bot_invoice_url;
    await this.prisma.tip.update({
      where: { id: tip.id },
      data: { externalId: String(invoice.invoice_id), checkoutUrl, paymentRef: String(invoice.invoice_id) },
    });
    return { tip: { ...tip, checkoutUrl }, checkoutUrl, web3: null };
  }

  async handleCryptoBotWebhook(body: any) {
    const payload = body.payload?.payload || body.payload;
    if (payload) await this.completeTip(String(payload), String(body.payload?.invoice_id || ''));
    return { ok: true };
  }

  private async completeTip(tipId: string, paymentRef?: string) {
    const tip = await this.prisma.tip.findUnique({ where: { id: tipId } });
    if (!tip || tip.status === 'COMPLETED') return tip;
    const updated = await this.prisma.tip.update({
      where: { id: tipId },
      data: { status: 'COMPLETED', paymentRef: paymentRef || tip.paymentRef },
    });
    await this.notifyTip(updated);
    return updated;
  }

  private async notifyTip(tip: any, message?: string) {
    try {
      const pretty = `${(tip.amount / 100).toFixed(2)} ${tip.currency}`;
      await this.notifications.create({
        type: 'SYSTEM',
        recipientId: tip.toUserId,
        actorId: tip.fromUserId,
        title: 'Новый донат!',
        body: `${pretty}${message || tip.message ? ` — «${(message || tip.message || '').slice(0, 60)}»` : ''}`,
        link: tip.videoId ? `/watch/${tip.videoId}` : '/tips',
        meta: { tipId: tip.id, amount: tip.amount },
      });
    } catch {}
  }

  async setPayoutSettings(userId: string, data: {
    payoutAddress?: string;
    yoomoneyWallet?: string;
    payeerAccount?: string;
  }) {
    if (data.payoutAddress && !/^0x[a-fA-F0-9]{40}$/.test(data.payoutAddress)) {
      throw new BadRequestException('Invalid EVM address');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        payoutAddress: data.payoutAddress,
        yoomoneyWallet: data.yoomoneyWallet,
        payeerAccount: data.payeerAccount,
      },
      select: { id: true, payoutAddress: true, yoomoneyWallet: true, payeerAccount: true },
    });
  }
}
