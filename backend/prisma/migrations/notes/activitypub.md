# ActivityPub schema changes

Add to User:
```
apPublicKey   String?
apPrivateKey  String?
```

Add to Channel relation:
```
apFollowers ApFollower[]
```

New model:
```prisma
model ApFollower {
  id           String   @id @default(cuid())
  actorId      String
  inbox        String
  sharedInbox  String?
  accepted     Boolean  @default(true)
  createdAt    DateTime @default(now())
  channelId    String
  channel      Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  @@unique([channelId, actorId])
  @@index([channelId])
  @@map("ap_followers")
}
```

```bash
npx prisma migrate dev --name activitypub
```

Env:
```
AP_BASE_URL=https://api.example.com
APP_URL=https://example.com
```
