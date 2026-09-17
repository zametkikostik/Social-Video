module.exports = {
  async setup(ctx) {
    ctx.logger.log('hello-webhook setup');
  },
  async onVideoReady(payload, ctx) {
    ctx.logger.log(`video ready: ${payload.videoId} — ${payload.title}`);
  },
  async onTipCompleted(payload, ctx) {
    ctx.logger.log(`tip completed: ${payload.tipId} amount=${payload.amount}`);
  },
};
