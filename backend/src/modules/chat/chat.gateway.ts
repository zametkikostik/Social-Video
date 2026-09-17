import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/live-chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private clients = new Map<
    string,
    { userId?: string; username?: string; streamId?: string }
  >();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'dev-secret-change-me',
        });
        this.clients.set(client.id, {
          userId: payload.sub || payload.id,
          username: payload.username,
        });
      } else {
        this.clients.set(client.id, {});
      }
    } catch {
      this.clients.set(client.id, {});
    }
  }

  handleDisconnect(client: Socket) {
    const info = this.clients.get(client.id);
    if (info?.streamId) {
      client.to(`stream:${info.streamId}`).emit('viewer_left', {
        socketId: client.id,
      });
    }
    this.clients.delete(client.id);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { streamId: string },
  ) {
    const streamId = body?.streamId;
    if (!streamId) return { error: 'streamId required' };

    const exists = await this.chatService.streamExists(streamId);
    if (!exists) return { error: 'Stream not found' };

    const prev = this.clients.get(client.id);
    if (prev?.streamId) client.leave(`stream:${prev.streamId}`);

    client.join(`stream:${streamId}`);
    this.clients.set(client.id, { ...prev, streamId });

    const history = await this.chatService.history(streamId, 50);
    client.emit('history', history);

    client.to(`stream:${streamId}`).emit('viewer_joined', {
      socketId: client.id,
      username: prev?.username,
    });

    return { ok: true, streamId };
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    const info = this.clients.get(client.id);
    if (info?.streamId) {
      client.leave(`stream:${info.streamId}`);
      client.to(`stream:${info.streamId}`).emit('viewer_left', {
        socketId: client.id,
      });
      this.clients.set(client.id, { ...info, streamId: undefined });
    }
    return { ok: true };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { streamId: string; text: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info?.userId) return { error: 'Auth required' };

    const streamId = body?.streamId || info.streamId;
    const text = body?.text;
    if (!streamId || !text?.trim()) {
      return { error: 'streamId and text required' };
    }

    try {
      const msg = await this.chatService.saveMessage({
        streamId,
        userId: info.userId,
        text,
      });
      this.server.to(`stream:${streamId}`).emit('message', msg);
      return { ok: true, message: msg };
    } catch (e: any) {
      return { error: e.message || 'Failed to send' };
    }
  }
}
