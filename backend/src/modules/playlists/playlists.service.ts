import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlaylistsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    title: string;
    description?: string;
    isPublic?: boolean;
    ownerId: string;
  }) {
    return this.prisma.playlist.create({
      data: {
        title: data.title,
        description: data.description,
        isPublic: data.isPublic ?? true,
        ownerId: data.ownerId,
      },
    });
  }

  async findById(id: string, viewerId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        items: {
          orderBy: { position: 'asc' },
          include: {
            video: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailKey: true,
                duration: true,
                views: true,
                status: true,
                visibility: true,
                channel: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');

    if (!playlist.isPublic && playlist.ownerId !== viewerId) {
      throw new ForbiddenException('Private playlist');
    }

    if (playlist.ownerId !== viewerId) {
      playlist.items = playlist.items.filter(
        (i) =>
          i.video.status === 'READY' && i.video.visibility === 'PUBLIC',
      );
    }

    return playlist;
  }

  async listByOwner(ownerId: string, includePrivate = false) {
    return this.prisma.playlist.findMany({
      where: {
        ownerId,
        ...(includePrivate ? {} : { isPublic: true }),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  async listMy(ownerId: string) {
    return this.listByOwner(ownerId, true);
  }

  async update(
    id: string,
    ownerId: string,
    data: { title?: string; description?: string; isPublic?: boolean },
  ) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== ownerId) {
      throw new ForbiddenException('Not your playlist');
    }

    return this.prisma.playlist.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isPublic: data.isPublic,
      },
    });
  }

  async delete(id: string, ownerId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== ownerId) {
      throw new ForbiddenException('Not your playlist');
    }

    await this.prisma.playlist.delete({ where: { id } });
    return { deleted: true };
  }

  async addVideo(playlistId: string, videoId: string, ownerId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== ownerId) {
      throw new ForbiddenException('Not your playlist');
    }

    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const existing = await this.prisma.playlistItem.findUnique({
      where: { playlistId_videoId: { playlistId, videoId } },
    });
    if (existing) throw new ConflictException('Video already in playlist');

    const maxPos = await this.prisma.playlistItem.aggregate({
      where: { playlistId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    const item = await this.prisma.playlistItem.create({
      data: { playlistId, videoId, position },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            duration: true,
            thumbnailKey: true,
          },
        },
      },
    });

    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { updatedAt: new Date() },
    });

    return item;
  }

  async removeVideo(playlistId: string, videoId: string, ownerId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== ownerId) {
      throw new ForbiddenException('Not your playlist');
    }

    const item = await this.prisma.playlistItem.findUnique({
      where: { playlistId_videoId: { playlistId, videoId } },
    });
    if (!item) throw new NotFoundException('Video not in playlist');

    await this.prisma.playlistItem.delete({ where: { id: item.id } });
    return { removed: true };
  }

  async reorder(
    playlistId: string,
    ownerId: string,
    orderedVideoIds: string[],
  ) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== ownerId) {
      throw new ForbiddenException('Not your playlist');
    }

    await this.prisma.$transaction(
      orderedVideoIds.map((videoId, index) =>
        this.prisma.playlistItem.updateMany({
          where: { playlistId, videoId },
          data: { position: index },
        }),
      ),
    );

    return { reordered: true };
  }
}
