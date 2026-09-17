# Social-Video Plugins

```
plugins/my-plugin/
  manifest.json
  index.js
```

Hooks: `onVideoReady`, `onCommentCreate`, `onTipCompleted`, `onUserRegister`, `onLiveStart`

API: `GET /api/plugins`

Docker: `./plugins` mounted at `/app/plugins` (`PLUGINS_DIR`).
