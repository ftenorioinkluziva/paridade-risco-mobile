"""Generate PWA icons: solid green circle on dark background."""
import os, struct, zlib


def create_png(width, height, r, g, b):
    def write_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + chunk + crc

    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b""
    cx, cy = width // 2, height // 2
    radius = min(width, height) // 2 - 2
    for y in range(height):
        row = b"\x00"  # filter byte
        for x in range(width):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist <= radius:
                row += bytes([r, g, b])
            else:
                row += bytes([22, 23, 27])
        raw += row
    compressed = zlib.compress(raw)
    return (
        b"\x89PNG\r\n\x1a\n"
        + write_chunk(b"IHDR", ihdr_data)
        + write_chunk(b"IDAT", compressed)
        + write_chunk(b"IEND", b"")
    )


icons_dir = "/opt/data/pr-mobile-work/apps/api/public/icons"
os.makedirs(icons_dir, exist_ok=True)

for size, label in [(192, "icon-192x192.png"), (512, "icon-512x512.png")]:
    png = create_png(size, size, 0x22, 0xC5, 0x5E)
    path = os.path.join(icons_dir, label)
    with open(path, "wb") as f:
        f.write(png)
    print(f"Created {label} ({size}x{size})")