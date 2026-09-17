import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { generateKeyPairSync } from 'crypto';

@Injectable()
export class FederationService {
  private readonly logger = new Logger(FederationService.name);
  private readonly publicBase: string;
  private readonly apiBase: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.apiBase = (
      this.config.get('AP_BASE_URL') ||
      this.config.get('API_URL') ||
      'http://localhost:4000'
    ).replace(/\/$/, '');
    this.publicBase = (
      this.config.get('APP_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  async ensureKeys(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.apPublicKey && user.apPrivateKey) {
      return { publicKey: user.apPublicKey, privateKey: user.apPrivateKey };
    }

    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { apPublicKey: publicKey, apPrivateKey: privateKey },
    });

    return { publicKey, privateKey };
  }

  channelActorId(slug: string) {
    return `${this.apiBase}/api/ap/channels/${slug}`;
  }

  userActorId(username: string) {
    return `${this.apiBase}/api/ap/users/${username}`;
  }

  async webfinger(resource: string) {
    let username = '';
    if (resource.startsWith('acct:')) {
      username = resource.slice(5).split('@')[0];
    } else if (resource.includes('/ap/channels/')) {
      const slug = resource.split('/ap/channels/')[1]?.split(/[?#]/)[0];
      const channel = await this.prisma.channel.findUnique({ where: { slug } });
      if (!channel) throw new NotFoundException('Not found');
      return this.webfingerResult(channel.slug, 'channel');
    } else {
      try {
        const u = new URL(resource);
        username = u.pathname.split('/').filter(Boolean).pop() || '';
      } catch {
        username = resource;
      }
    }

    const channel = await this.prisma.channel.findUnique({
      where: { slug: username },
    });
    if (channel) return this.webfingerResult(channel.slug, 'channel');

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (user) return this.webfingerResult(user.username, 'user');

    throw new NotFoundException('Resource not found');
  }

  private webfingerResult(name: string, kind: 'channel' | 'user') {
    const href =
      kind === 'channel'
        ? this.channelActorId(name)
        : this.userActorId(name);
    const domain = new URL(this.apiBase).host;
    return {
      subject: `acct:${name}@${domain}`,
      aliases: [href],
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href,
        },
        {
          rel: 'http://webfinger.net/rel/profile-page',
          type: 'text/html',
          href:
            kind === 'channel'
              ? `${this.publicBase}/channel/${name}`
              : `${this.publicBase}/`,
        },
      ],
    };
  }

  async getChannelActor(slug: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { slug },
      include: { owner: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const keys = await this.ensureKeys(channel.ownerId);
    const id = this.channelActorId(slug);

    return {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://w3id.org/security/v1',
      ],
      id,
      type: 'Person',
      preferredUsername: channel.slug,
      name: channel.name,
      summary: channel.description || '',
      url: `${this.publicBase}/channel/${channel.slug}`,
      inbox: `${id}/inbox`,
      outbox: `${id}/outbox`,
      followers: `${id}/followers`,
      following: `${id}/following`,
      published: channel.createdAt.toISOString(),
      icon: channel.avatarUrl
        ? { type: 'Image', url: channel.avatarUrl }
        : undefined,
      publicKey: {
        id: `${id}#main-key`,
        owner: id,
        publicKeyPem: keys.publicKey,
      },
      endpoints: {
        sharedInbox: `${this.apiBase}/api/ap/sharedInbox`,
      },
    };
  }

  async getUserActor(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const keys = await this.ensureKeys(user.id);
    const id = this.userActorId(username);

    return {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://w3id.org/security/v1',
      ],
      id,
      type: 'Person',
      preferredUsername: user.username,
      name: user.displayName || user.username,
      summary: user.bio || '',
      url: this.publicBase,
      inbox: `${id}/inbox`,
      outbox: `${id}/outbox`,
      publicKey: {
        id: `${id}#main-key`,
        owner: id,
        publicKeyPem: keys.publicKey,
      },
      endpoints: {
        sharedInbox: `${this.apiBase}/api/ap/sharedInbox`,
      },
    };
  }

  async channelOutbox(slug: string, page?: number) {
    const channel = await this.prisma.channel.findUnique({ where: { slug } });
    if (!channel) throw new NotFoundException('Channel not found');

    const id = this.channelActorId(slug);
    const limit = 20;
    const pageNum = page && page > 0 ? page : 1;
    const skip = (pageNum - 1) * limit;

    const [total, videos] = await Promise.all([
      this.prisma.video.count({
        where: {
          channelId: channel.id,
          status: 'READY',
          visibility: 'PUBLIC',
          moderationStatus: { in: ['APPROVED', 'SKIPPED_VERIFIED'] },
        },
      }),
      this.prisma.video.findMany({
        where: {
          channelId: channel.id,
          status: 'READY',
          visibility: 'PUBLIC',
          moderationStatus: { in: ['APPROVED', 'SKIPPED_VERIFIED'] },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    const orderedItems = videos.map((v) => this.videoCreateActivity(v, slug));

    if (page) {
      return {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `${id}/outbox?page=${pageNum}`,
        type: 'OrderedCollectionPage',
        partOf: `${id}/outbox`,
        orderedItems,
        next:
          skip + videos.length < total
            ? `${id}/outbox?page=${pageNum + 1}`
            : undefined,
      };
    }

    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${id}/outbox`,
      type: 'OrderedCollection',
      totalItems: total,
      first: `${id}/outbox?page=1`,
    };
  }

  private videoCreateActivity(video: any, channelSlug: string) {
    const actor = this.channelActorId(channelSlug);
    const objectId = `${this.apiBase}/api/ap/videos/${video.id}`;
    return {
      id: `${objectId}/activity`,
      type: 'Create',
      actor,
      published: (video.publishedAt || video.createdAt).toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      object: {
        id: objectId,
        type: 'Video',
        name: video.title,
        content: video.description || '',
        url: `${this.publicBase}/watch/${video.id}`,
        duration: video.duration ? `PT${video.duration}S` : undefined,
        published: (video.publishedAt || video.createdAt).toISOString(),
        attributedTo: actor,
        to: ['https://www.w3.org/ns/activitystreams#Public'],
      },
    };
  }

  async getVideoObject(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { channel: true },
    });
    if (!video || video.visibility !== 'PUBLIC') {
      throw new NotFoundException('Video not found');
    }
    const activity = this.videoCreateActivity(video, video.channel.slug);
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      ...activity.object,
    };
  }

  async channelFollowers(slug: string) {
    const channel = await this.prisma.channel.findUnique({ where: { slug } });
    if (!channel) throw new NotFoundException('Channel not found');

    const followers = await this.prisma.apFollower.findMany({
      where: { channelId: channel.id, accepted: true },
      take: 100,
    });

    const id = this.channelActorId(slug);
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${id}/followers`,
      type: 'OrderedCollection',
      totalItems: followers.length,
      orderedItems: followers.map((f) => f.actorId),
    };
  }

  async handleInbox(slug: string, activity: any) {
    const channel = await this.prisma.channel.findUnique({ where: { slug } });
    if (!channel) throw new NotFoundException('Channel not found');

    const type = activity?.type;
    this.logger.log(`AP inbox ${slug}: ${type}`);

    if (type === 'Follow') {
      const actorId =
        typeof activity.actor === 'string'
          ? activity.actor
          : activity.actor?.id;
      if (!actorId) return { ok: false, error: 'No actor' };

      let inbox = actorId + '/inbox';
      let sharedInbox: string | undefined;
      try {
        const res = await fetch(actorId, {
          headers: { Accept: 'application/activity+json' },
        });
        if (res.ok) {
          const remote = await res.json();
          inbox = remote.inbox || inbox;
          sharedInbox = remote.endpoints?.sharedInbox;
        }
      } catch {
        this.logger.warn(`Could not fetch remote actor ${actorId}`);
      }

      await this.prisma.apFollower.upsert({
        where: {
          channelId_actorId: { channelId: channel.id, actorId },
        },
        create: {
          channelId: channel.id,
          actorId,
          inbox,
          sharedInbox,
          accepted: true,
        },
        update: { inbox, sharedInbox, accepted: true },
      });

      return {
        ok: true,
        accepted: {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Accept',
          actor: this.channelActorId(slug),
          object: activity,
        },
      };
    }

    if (type === 'Undo' && activity.object?.type === 'Follow') {
      const actorId =
        typeof activity.actor === 'string'
          ? activity.actor
          : activity.actor?.id;
      if (actorId) {
        await this.prisma.apFollower.deleteMany({
          where: { channelId: channel.id, actorId },
        });
      }
      return { ok: true };
    }

    return { ok: true, ignored: type };
  }

  async handleSharedInbox(activity: any) {
    const objectId =
      typeof activity.object === 'string'
        ? activity.object
        : activity.object?.id;
    if (activity.type === 'Follow' && objectId?.includes('/ap/channels/')) {
      const slug = objectId.split('/ap/channels/')[1]?.split(/[/?#]/)[0];
      if (slug) return this.handleInbox(slug, activity);
    }
    return { ok: true, ignored: true };
  }

  nodeInfo() {
    return {
      version: '2.1',
      software: {
        name: 'social-video',
        version: '0.1.0',
        repository: 'https://github.com/zametkikostik/Social-Video',
      },
      protocols: ['activitypub'],
      services: { inbound: [], outbound: [] },
      openRegistrations: true,
      usage: { users: { total: 0 }, localPosts: 0 },
      metadata: {
        nodeName: 'Social-Video',
        nodeDescription: 'Open-source social video platform (AGPLv3)',
      },
    };
  }

  nodeInfoWellKnown() {
    return {
      links: [
        {
          rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
          href: `${this.apiBase}/api/ap/nodeinfo/2.1`,
        },
      ],
    };
  }
}
