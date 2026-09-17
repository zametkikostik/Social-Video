export type PluginHook =
  | 'onVideoReady'
  | 'onCommentCreate'
  | 'onTipCompleted'
  | 'onUserRegister'
  | 'onLiveStart';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  hooks?: PluginHook[];
  enabled?: boolean;
}

export interface PluginContext {
  config: Record<string, unknown>;
  logger: { log: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };
}

export interface PluginModule {
  manifest: PluginManifest;
  setup?: (ctx: PluginContext) => void | Promise<void>;
  onVideoReady?: (payload: { videoId: string; title: string; channelId: string }, ctx: PluginContext) => void | Promise<void>;
  onCommentCreate?: (payload: { commentId: string; videoId: string; userId: string }, ctx: PluginContext) => void | Promise<void>;
  onTipCompleted?: (payload: { tipId: string; amount: number; toUserId: string }, ctx: PluginContext) => void | Promise<void>;
  onUserRegister?: (payload: { userId: string; username: string }, ctx: PluginContext) => void | Promise<void>;
  onLiveStart?: (payload: { streamId: string; channelId: string }, ctx: PluginContext) => void | Promise<void>;
}
