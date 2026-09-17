#!/usr/bin/env python3
"""Generate simple PWA PNG icons (no external deps)."""
import struct, zlib, os

def write_png(path, size, rgb=(225, 29, 72)):
    w = h = size
    t1 = (int(w * 0.38), int(h * 0.28))
    t2 = (int(w * 0.38), int(h * 0.72))
    t3 = (int(w * 0.72), int(h * 0.50))

    def in_triangle(x, y):
        def sign(p1, p2, p3):
            return (x - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (y - p3[1])
        b1 = sign((x, y), t1, t2) < 0
        b2 = sign((x, y), t2, t3) < 0
        b3 = sign((x, y), t3, t1) < 0
        return b1 == b2 == b3

    r, g, b = rgb
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            if in_triangle(x, y):
                raw.extend([255, 255, 255, 255])
            else:
                raw.extend([r, g, b, 255])

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)
    print('wrote', path)

if __name__ == '__main__':
    base = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    write_png(os.path.join(base, 'icon-192.png'), 192)
    write_png(os.path.join(base, 'icon-512.png'), 512)
    write_png(os.path.join(base, 'icon-maskable-512.png'), 512)
    write_png(os.path.join(base, 'apple-touch-icon.png'), 180)
