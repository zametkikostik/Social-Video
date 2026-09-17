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
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
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
  ],
})
export class AppModule {}
