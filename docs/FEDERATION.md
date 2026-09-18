# ActivityPub / Fediverse

## Built-in

- WebFinger, NodeInfo
- Actor (channel/user) + RSA keys
- Outbox / Inbox / sharedInbox
- HTTP Signatures (rsa-sha256)
- Follow + Accept / Undo
- Create(Video) fan-out to followers **and relays**
- Like / Announce / Delete federation
- Outbound Follow remote actors
- JSON object proxy + **media proxy** (`/api/ap/media-proxy?url=`)
- UI: `/federate`

## Relays

Admin: `POST /api/ap/relays` `{ "actorUrl": "https://relay…/actor" }`

List: `GET /api/ap/relays`

Public READY videos are also delivered to enabled relay inboxes.

## Media proxy

```
GET /api/ap/media-proxy?url=https://remote.example/path/file.mp4
```

Optional: `AP_PROXY_ALLOW=host1.com,host2.com` · `AP_PROXY_MAX_MB=50`

## Migrate

```bash
cd backend && npx prisma migrate dev --name ap_relays
```
