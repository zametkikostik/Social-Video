import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VideosModule } from './modules/videos/videos.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { StorageModule } from './modules/storage/storage.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { TranscoderModule } from './modules/transcoder/transcoder.module';
import { LikesModule } from './modules/likes/likes.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { IpfsModule } from './modules/ipfs/ipfs.module';
import { LiveModule } from './modules/live/live.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunityModule } from './modules/community/community.module';
import { ChatModule } from './modules/chat/chat.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { TipsModule } from './modules/tips/tips.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    IpfsModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    VideosModule,
    ChannelsModule,
    StorageModule,
    ModerationModule,
    TranscoderModule,
    LikesModule,
    CommentsModule,
    SubscriptionsModule,
    PlaylistsModule,
    LiveModule,
    CommunityModule,
    ChatModule,
    RecommendationsModule,
    TipsModule,
    AdminModule,
  ],
})
export class AppModule {}
