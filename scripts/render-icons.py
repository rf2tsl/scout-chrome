#!/usr/bin/env python3
"""Rasterize Scout reticle icon (canonical SVG geometry) to PNG.

The icon is a squircle tile with concentric rings, a center dot, and four
crosshair tick marks. All values mirror public/icons/scout-icon.svg.

We hand-render in stdlib (math + zlib + struct) so the toolchain has zero
dependencies. Anti-aliasing via 1-pixel smoothstep coverage on every shape.
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

# ── Palette (from the design's Scout Icon System) ──
ACCENT = (0, 212, 170)   # #00d4aa
BASE   = (13, 17, 23)    # #0d1117

# All geometry in a 128×128 reference frame; scaled at render time.
TILE_RADIUS = 28          # 22% rounded square
RING_OUTER = (42, 3, 0.28)   # (radius, stroke, opacity) — scan radius
RING_INNER = (28, 5, 0.75)   # shortlist
DOT_RADIUS = 9
TICK_STROKE = 4
TICKS = [
    ((64, 14), (64, 22)),    # top
    ((64, 106), (64, 114)),  # bottom
    ((14, 64), (22, 64)),    # left
    ((106, 64), (114, 64)),  # right
]


def _smoothstep(d: float) -> float:
    """Coverage from a signed distance (positive = inside) over a 1-pixel band."""
    return max(0.0, min(1.0, d + 0.5))


def _rounded_rect_sdf(x: float, y: float, half_w: float, half_h: float, r: float) -> float:
    """Signed distance to a rounded rect centered at origin. Negative inside."""
    qx = abs(x) - (half_w - r)
    qy = abs(y) - (half_h - r)
    ax, ay = max(qx, 0.0), max(qy, 0.0)
    return math.sqrt(ax * ax + ay * ay) + min(max(qx, qy), 0.0) - r


def _circle_stroke_cov(d: float, radius: float, stroke: float) -> float:
    """Coverage for a stroked circle of given radius and stroke width.
    `d` is distance from center."""
    half = stroke * 0.5
    inner = radius - half
    outer = radius + half
    return max(0.0, min(_smoothstep(d - inner), _smoothstep(outer - d)))


def _circle_fill_cov(d: float, radius: float) -> float:
    return _smoothstep(radius - d)


def _segment_cov(
    px: float, py: float, ax: float, ay: float, bx: float, by: float, stroke: float,
) -> float:
    """Coverage for a stroked line segment with rounded caps."""
    abx, aby = bx - ax, by - ay
    apx, apy = px - ax, py - ay
    length2 = abx * abx + aby * aby
    if length2 == 0:
        d = math.sqrt(apx * apx + apy * apy)
    else:
        t = max(0.0, min(1.0, (apx * abx + apy * aby) / length2))
        cx, cy = ax + t * abx, ay + t * aby
        d = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
    return _smoothstep(stroke * 0.5 - d)


def render_pixels(size: int) -> bytes:
    """Return raw RGBA bytes (no PNG framing) at the requested size."""
    s = size / 128.0  # uniform scale

    # Pre-scale geometry (closures avoid recomputing per pixel).
    half = size / 2
    cx = cy = (size - 1) / 2  # center in pixel space
    tile_r = TILE_RADIUS * s
    ring_outer_r = RING_OUTER[0] * s
    ring_outer_w = RING_OUTER[1] * s
    ring_outer_a = RING_OUTER[2]
    ring_inner_r = RING_INNER[0] * s
    ring_inner_w = RING_INNER[1] * s
    ring_inner_a = RING_INNER[2]
    dot_r = DOT_RADIUS * s
    tick_w = TICK_STROKE * s
    ticks = [
        ((a[0] * s, a[1] * s), (b[0] * s, b[1] * s)) for (a, b) in TICKS
    ]

    out = bytearray()
    for y in range(size):
        out.append(0)  # PNG filter byte (None)
        py = y - cy + 0.5  # +0.5 sample at pixel center
        for x in range(size):
            px = x - cx + 0.5
            # Tile coverage (rounded square).
            tile_d = _rounded_rect_sdf(px, py, half, half, tile_r)
            tile_cov = _smoothstep(-tile_d)
            if tile_cov <= 0:
                out.extend([0, 0, 0, 0])
                continue

            # Reticle elements relative to icon center.
            d = math.sqrt(px * px + py * py)
            outer_cov = _circle_stroke_cov(d, ring_outer_r, ring_outer_w) * ring_outer_a
            inner_cov = _circle_stroke_cov(d, ring_inner_r, ring_inner_w) * ring_inner_a
            dot_cov = _circle_fill_cov(d, dot_r)

            # Crosshair ticks.
            tick_cov = 0.0
            for (ax, ay), (bx, by) in ticks:
                tick_cov = max(tick_cov, _segment_cov(px, py, ax, ay, bx, by, tick_w))

            accent_cov = max(outer_cov, inner_cov, dot_cov, tick_cov)
            # Composite accent over base. Both clipped by the squircle.
            r = BASE[0] * (1 - accent_cov) + ACCENT[0] * accent_cov
            g = BASE[1] * (1 - accent_cov) + ACCENT[1] * accent_cov
            b = BASE[2] * (1 - accent_cov) + ACCENT[2] * accent_cov
            a = tile_cov  # squircle owns alpha

            out.extend([int(r), int(g), int(b), int(a * 255)])
    return bytes(out)


def encode_png(size: int, raw_rgba: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(
            ">I", zlib.crc32(tag + data),
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw_rgba, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "public" / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        raw = render_pixels(size)
        png = encode_png(size, raw)
        path = out_dir / f"icon-{size}.png"
        path.write_bytes(png)
        print(f"wrote {path} ({size}×{size}, {len(png)} bytes)")


if __name__ == "__main__":
    main()
