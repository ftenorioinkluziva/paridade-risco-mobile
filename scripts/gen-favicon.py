"""Generate favicon PNG (32x32) for the app."""
import struct, zlib

def create_png(width, height, r, g, b):
    def wc(t, d):
        crc = struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
        return struct.pack(">I", len(d)) + t + d + crc

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b""
    cx, cy = width // 2, height // 2
    radius = min(width, height) // 2 - 2
    for y in range(height):
        row = b"\x00"
        for x in range(width):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            row += bytes([r, g, b]) if dist <= radius else bytes([22, 23, 27])
        raw += row
    return (
        b"\x89PNG\r\n\x1a\n"
        + wc(b"IHDR", ihdr)
        + wc(b"IDAT", zlib.compress(raw))
        + wc(b"IEND", b"")
    )

png = create_png(32, 32, 0x22, 0xC5, 0x5E)
with open("/opt/data/pr-mobile-work/apps/api/public/favicon.png", "wb") as f:
    f.write(png)
print("favicon.png created")