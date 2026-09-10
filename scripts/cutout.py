#!/usr/bin/env python3
"""
把纯白背景的棋子渲染图抠成透明 PNG。
策略：从四角做 flood-fill，只移除与边缘连通的浅色背景像素，
从而保留角色内部的白色/浅色区域（如狮子口鼻、小鸡腹部）。
最后自动裁剪到内容边界并留少量留白。

用法: python3 cutout.py <input.png> <output.png>
"""
import sys
from collections import deque
from PIL import Image


def is_bg(px, thresh):
    r, g, b = px[0], px[1], px[2]
    # 背景为近白：三通道都很亮
    return r >= thresh and g >= thresh and b >= thresh


def cutout(inp, outp, thresh=232, feather=True):
    img = Image.open(inp).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = bytearray(w * h)
    q = deque()

    def push(x, y):
        idx = y * w + x
        if not visited[idx]:
            visited[idx] = 1
            q.append((x, y))

    # 四条边所有像素入队作为种子
    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    bg_mask = bytearray(w * h)
    while q:
        x, y = q.popleft()
        idx = y * w + x
        if not is_bg(px[x, y], thresh):
            continue
        bg_mask[idx] = 1
        if x > 0:
            push(x - 1, y)
        if x < w - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < h - 1:
            push(x, y + 1)

    # 应用透明
    for y in range(h):
        for x in range(w):
            if bg_mask[y * w + x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)

    # 边缘羽化：对紧邻背景的半透明处理，减少白边
    if feather:
        src = img.copy()
        spx = src.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0:
                    continue
                # 若邻域含背景，则轻微降低不透明并压暗白边
                neighbor_bg = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        neighbor_bg = True
                        break
                if neighbor_bg:
                    r, g, b, a = spx[x, y]
                    px[x, y] = (r, g, b, 200)

    # 裁剪到不透明内容边界
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # 方形画布 + 少量留白，避免棋子贴边
    cw, ch = img.size
    side = int(max(cw, ch) * 1.08)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - cw) // 2, (side - ch) // 2), img)
    canvas.save(outp)
    print(f"OK {outp}  {side}x{side}")


if __name__ == "__main__":
    cutout(sys.argv[1], sys.argv[2])
