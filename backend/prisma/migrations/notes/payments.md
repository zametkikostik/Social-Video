# Payments schema

```prisma
enum PaymentProvider {
  INTERNAL
  STRIPE
  WEB3
  YOOMONEY
  PAYEER
  CRYPTOBOT
}

// Tip: add provider, chainId, txHash, fromAddress, toAddress, externalId, checkoutUrl, meta
// status default PENDING

// User: payoutAddress, yoomoneyWallet, payeerAccount
```

```bash
npx prisma migrate dev --name payments-providers
```

Env: see `.env.example` (WEB3_*, STRIPE_*, YOOMONEY_*, PAYEER_*, CRYPTOBOT_TOKEN).
