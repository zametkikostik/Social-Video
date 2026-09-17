import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PluginHook, PluginManifest, PluginModule, PluginContext } from './plugin.types';

@Injectable()
export class PluginsService implements OnModuleInit {
  private readonly logger = new Logger(PluginsService.name);
  private plugins: PluginModule[] = [];
  private configs = new Map<string, Record<string, unknown>>();

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const candidates = [
      this.config.get('PLUGINS_DIR'),
      path.resolve(process.cwd(), 'plugins'),
      path.resolve(process.cwd(), '..', 'plugins'),
      '/app/plugins',
    ].filter(Boolean) as string[];
    for (const d of candidates) {
      if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
        await this.loadFromDir(d);
        break;
      }
    }
    this.logger.log(`Plugins loaded: ${this.plugins.length}`);
  }

  private async loadFromDir(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const pluginPath = path.join(dir, ent.name);
      const manifestPath = path.join(pluginPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.enabled === false) continue;
        const mainFile = path.join(pluginPath, 'index.js');
        let mod: any = { manifest };
        if (fs.existsSync(mainFile)) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          mod = require(mainFile);
        }
        const plugin: PluginModule = {
          manifest,
          setup: mod.setup,
          onVideoReady: mod.onVideoReady,
          onCommentCreate: mod.onCommentCreate,
          onTipCompleted: mod.onTipCompleted,
          onUserRegister: mod.onUserRegister,
          onLiveStart: mod.onLiveStart,
        };
        this.configs.set(manifest.id, {});
        const ctx = this.ctx(manifest.id);
        if (plugin.setup) await plugin.setup(ctx);
        this.plugins.push(plugin);
        this.logger.log(`Plugin enabled: ${manifest.id}@${manifest.version}`);
      } catch (e: any) {
        this.logger.error(`Failed to load plugin ${ent.name}: ${e.message}`);
      }
    }
  }

  private ctx(id: string): PluginContext {
    return {
      config: this.configs.get(id) || {},
      logger: {
        log: (m) => this.logger.log(`[${id}] ${m}`),
        warn: (m) => this.logger.warn(`[${id}] ${m}`),
        error: (m) => this.logger.error(`[${id}] ${m}`),
      },
    };
  }

  list(): PluginManifest[] {
    return this.plugins.map((p) => p.manifest);
  }

  async emit(hook: PluginHook, payload: any) {
    for (const p of this.plugins) {
      const fn = (p as any)[hook] as Function | undefined;
      if (!fn) continue;
      try {
        await fn(payload, this.ctx(p.manifest.id));
      } catch (e: any) {
        this.logger.error(`Plugin ${p.manifest.id} ${hook}: ${e.message}`);
      }
    }
  }
}
