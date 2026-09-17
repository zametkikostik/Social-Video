import { Injectable } from '@nestjs/common';

type Labels = Record<string, string>;

@Injectable()
export class MetricsService {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  private key(name: string, labels?: Labels) {
    if (!labels || !Object.keys(labels).length) return name;
    const parts = Object.keys(labels)
      .sort()
      .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`,)
      .join(',');
    return `${name}{${parts}}`;
  }

  inc(name: string, labels?: Labels, by = 1) {
    const k = this.key(name, labels);
    this.counters.set(k, (this.counters.get(k) || 0) + by);
  }

  setGauge(name: string, value: number, labels?: Labels) {
    this.gauges.set(this.key(name, labels), value);
  }

  observeMs(name: string, ms: number, labels?: Labels) {
    const k = this.key(name, labels);
    const arr = this.histograms.get(k) || [];
    arr.push(ms);
    if (arr.length > 500) arr.shift();
    this.histograms.set(k, arr);
  }

  render(): string {
    const lines: string[] = [];
    lines.push('# HELP socialvideo_up 1 if process is up');
    lines.push('# TYPE socialvideo_up gauge');
    lines.push('socialvideo_up 1');
    lines.push('# HELP process_resident_memory_bytes RSS memory');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${process.memoryUsage().rss}`);
    lines.push('# HELP process_uptime_seconds Process uptime');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${process.uptime().toFixed(0)}`);

    for (const [k, v] of this.counters) {
      lines.push(`${k} ${v}`);
    }
    for (const [k, v] of this.gauges) {
      lines.push(`${k} ${v}`);
    }
    for (const [k, samples] of this.histograms) {
      if (!samples.length) continue;
      const sum = samples.reduce((a, b) => a + b, 0);
      const avg = sum / samples.length;
      const sorted = [...samples].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      lines.push(`${k}_avg ${avg.toFixed(2)}`);
      lines.push(`${k}_p95 ${p95.toFixed(2)}`);
      lines.push(`${k}_count ${samples.length}`);
    }
    lines.push('');
    return lines.join('\n');
  }
}
