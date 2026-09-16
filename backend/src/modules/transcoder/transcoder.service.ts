import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface TranscodeJobData {
  videoId: string;
  originalKey: string;
  isShort?: boolean;
}

@Injectable()
export class TranscoderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranscoderService.name);
  private queue: Queue;
  private worker: Worker;
  private readonly redisUrl: string;
  private readonly qualities: string[];
  private readonly segmentDuration: number;
  private readonly ffmpegPath: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private storage: StorageService,
  ) {
    this.redisUrl = this.config.get('REDIS_URL') || 'redis://localhost:6379';
    this.qualities = (this.config.get('TRANSCODE_QUALITIES') || '1080p,720p,480p,360p').split(',');
    this.segmentDuration = parseInt(this.config.get('HLS_SEGMENT_DURATION') || '6', 10);
    this.ffmpegPath = this.config.get('FFMPEG_PATH') || 'ffmpeg';
  }

  async onModuleInit() {
    const connection = this.parseRedisUrl(this.redisUrl);

    this.queue = new Queue('transcode', { connection });

    this.worker = new Worker(
      'transcode',
      async (job: Job<TranscodeJobData>) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Transcode job ${job.id} completed for video ${job.data.videoId}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Transcode job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Transcoder queue & worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(data: TranscodeJobData) {
    const job = await this.queue.add('transcode-video', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    this.logger.log(`Enqueued transcode job ${job.id} for video ${data.videoId}`);
    return job.id;
  }

  private async processJob(job: Job<TranscodeJobData>) {
    const { videoId, originalKey, isShort } = job.data;
    const workDir = path.join(os.tmpdir(), `sv-transcode-${randomUUID()}`);

    try {
      await fs.mkdir(workDir, { recursive: true });

      const inputPath = path.join(workDir, 'original');
      await this.downloadObject(originalKey, inputPath);

      const probe = await this.probeVideo(inputPath);

      const hlsDir = path.join(workDir, 'hls');
      await fs.mkdir(hlsDir, { recursive: true });

      const variants = isShort
        ? this.qualities.filter((q) => ['720p', '480p', '360p'].includes(q))
        : this.qualities;

      const playlistFiles: { quality: string; file: string; bandwidth: number; resolution: string }[] = [];

      for (const quality of variants) {
        const settings = this.getQualitySettings(quality);
        const outDir = path.join(hlsDir, quality);
        await fs.mkdir(outDir, { recursive: true });
        const playlistPath = path.join(outDir, 'index.m3u8');

        await this.runFFmpeg(inputPath, playlistPath, settings);

        playlistFiles.push({
          quality,
          file: `${quality}/index.m3u8`,
          bandwidth: settings.bandwidth,
          resolution: settings.resolution,
        });
      }

      const masterContent = this.buildMasterPlaylist(playlistFiles);
      const masterPath = path.join(hlsDir, 'master.m3u8');
      await fs.writeFile(masterPath, masterContent);

      const thumbPath = path.join(workDir, 'thumb.jpg');
      await this.generateThumbnail(inputPath, thumbPath, probe.duration);

      const baseKey = `videos/${videoId}`;
      const hlsMasterKey = `${baseKey}/hls/master.m3u8`;
      const thumbnailKey = `${baseKey}/thumb.jpg`;

      await this.uploadFile(masterPath, hlsMasterKey, 'application/vnd.apple.mpegurl');
      await this.uploadDirectory(hlsDir, `${baseKey}/hls`);
      await this.uploadFile(thumbPath, thumbnailKey, 'image/jpeg');

      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'READY',
          hlsMasterKey,
          thumbnailKey,
          duration: Math.round(probe.duration),
          width: probe.width,
          height: probe.height,
          publishedAt: new Date(),
        },
      });

      this.logger.log(`Video ${videoId} is READY`);
      return { success: true, hlsMasterKey, thumbnailKey };
    } catch (err: any) {
      this.logger.error(`Transcode failed for ${videoId}: ${err.message}`);

      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'FAILED',
          moderationReason: `Transcode error: ${err.message}`,
        },
      });

      throw err;
    } finally {
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {}
    }
  }

  private getQualitySettings(quality: string) {
    const map: Record<string, { height: number; bitrate: string; bandwidth: number; resolution: string }> = {
      '1080p': { height: 1080, bitrate: '5000k', bandwidth: 5500000, resolution: '1920x1080' },
      '720p':  { height: 720,  bitrate: '2800k', bandwidth: 3000000, resolution: '1280x720' },
      '480p':  { height: 480,  bitrate: '1400k', bandwidth: 1500000, resolution: '854x480' },
      '360p':  { height: 360,  bitrate: '800k',  bandwidth: 900000,  resolution: '640x360' },
    };
    return map[quality] || map['720p'];
  }

  private buildMasterPlaylist(
    variants: { quality: string; file: string; bandwidth: number; resolution: string }[],
  ): string {
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n';
    for (const v of variants) {
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.resolution}\n`;
      content += `${v.file}\n`;
    }
    return content;
  }

  private runFFmpeg(
    input: string,
    outputPlaylist: string,
    settings: { height: number; bitrate: string },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', input,
        '-vf', `scale=-2:${settings.height}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', settings.bitrate,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2',
        '-f', 'hls',
        '-hls_time', String(this.segmentDuration),
        '-hls_list_size', '0',
        '-hls_segment_filename', path.join(path.dirname(outputPlaylist), 'seg_%03d.ts'),
        outputPlaylist,
      ];

      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';

      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-500)}`));
      });
      proc.on('error', (err) => reject(err));
    });
  }

  private generateThumbnail(input: string, output: string, duration: number): Promise<void> {
    const seek = Math.min(Math.max(duration * 0.1, 1), 30);
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-ss', String(seek),
        '-i', input,
        '-vframes', '1',
        '-q:v', '2',
        output,
      ];
      const proc = spawn(this.ffmpegPath, args);
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Thumbnail failed'))));
      proc.on('error', reject);
    });
  }

  private probeVideo(input: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve) => {
      const proc = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        input,
      ]);
      let stdout = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        if (code !== 0) {
          resolve({ duration: 0, width: 1280, height: 720 });
          return;
        }
        try {
          const data = JSON.parse(stdout);
          const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
          resolve({
            duration: parseFloat(data.format?.duration || '0'),
            width: videoStream?.width || 1280,
            height: videoStream?.height || 720,
          });
        } catch {
          resolve({ duration: 0, width: 1280, height: 720 });
        }
      });
      proc.on('error', () => resolve({ duration: 0, width: 1280, height: 720 }));
    });
  }

  private async downloadObject(key: string, destPath: string) {
    const client = this.createS3Client();
    const bucket = this.storage.getBucket();

    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }
    await fs.writeFile(destPath, Buffer.concat(chunks));
  }

  private async uploadFile(localPath: string, key: string, contentType: string) {
    const client = this.createS3Client();
    const bucket = this.storage.getBucket();
    const body = await fs.readFile(localPath);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  private async uploadDirectory(localDir: string, prefix: string) {
    const entries = await fs.readdir(localDir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(localDir, entry.name);
      if (entry.isDirectory()) {
        await this.uploadDirectory(full, `${prefix}/${entry.name}`);
      } else {
        const contentType = entry.name.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : entry.name.endsWith('.ts')
            ? 'video/mp2t'
            : 'application/octet-stream';
        await this.uploadFile(full, `${prefix}/${entry.name}`, contentType);
      }
    }
  }

  private createS3Client(): S3Client {
    const r2AccountId = this.config.get<string>('R2_ACCOUNT_ID');
    const r2AccessKey = this.config.get<string>('R2_ACCESS_KEY_ID');
    const r2Secret = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    if (r2AccountId && r2AccessKey && r2Secret) {
      return new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2Secret,
        },
      });
    }

    return new S3Client({
      region: this.config.get('S3_REGION') || 'us-east-1',
      endpoint: this.config.get('S3_ENDPOINT') || 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.config.get('S3_SECRET_KEY') || 'minioadmin',
      },
    });
  }

  private parseRedisUrl(url: string) {
    try {
      const u = new URL(url);
      return {
        host: u.hostname || 'localhost',
        port: parseInt(u.port || '6379', 10),
      };
    } catch {
      return { host: 'localhost', port: 6379 };
    }
  }
}
