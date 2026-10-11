# 生成首页 3D 头像用的深度图 docs/public/avatar-depth.png
#
# 依赖：pip install onnxruntime numpy scipy pillow
# 模型：https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx
# 用法：python scripts/avatar-depth.py docs/public/avatar.jpeg isnet-anime.onnx docs/public/avatar-depth.png preview.png
#
# 换头像后重新运行一次；脸部位置（下方 face 的中心与范围）按新头像调整。
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image
from scipy import ndimage

src, model, out, preview = sys.argv[1:5]

im = Image.open(src).convert('RGB')
W, H = im.size

# isnet-anime：1024×1024 输入，均值 (0.485, 0.456, 0.406)，方差 1
x = np.asarray(im.resize((1024, 1024), Image.LANCZOS), dtype=np.float32) / 255.0
x = x / x.max()
x = (x - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / 1.0
x = x.transpose(2, 0, 1)[None]

sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
pred = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
pred = (pred - pred.min()) / (pred.max() - pred.min())
mask = np.asarray(Image.fromarray((pred * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS), dtype=np.float32) / 255.0

# 人物：离轮廓越远越凸起，模拟体积感
hard = mask > 0.5
dist = ndimage.distance_transform_edt(hard)
bulge = np.sqrt(dist / max(dist.max(), 1.0))
fg = 0.55 + 0.35 * bulge
# 侧脸朝向画面左侧，让脸部比肩背更靠前
xx = np.linspace(0, 1, W, dtype=np.float32)[None, :]
face = np.exp(-(((xx - 0.36) / 0.13) ** 2 + ((np.linspace(0, 1, H, dtype=np.float32)[:, None] - 0.52) / 0.16) ** 2))
fg = np.clip(fg + 0.22 * face, 0, 1)

# 背景：整体在远处，下方略近，形成地面感
yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
bg = np.broadcast_to(0.08 + 0.14 * yy, (H, W))

depth = mask * fg + (1 - mask) * bg
# 模糊过渡，避免位移时轮廓撕裂
depth = ndimage.gaussian_filter(depth, sigma=W / 90)
depth = np.clip(depth, 0, 1)

Image.fromarray((depth * 255).astype(np.uint8), 'L').save(out, optimize=True)

pv = Image.new('RGB', (W * 3, H))
pv.paste(im, (0, 0))
pv.paste(Image.fromarray((mask * 255).astype(np.uint8)).convert('RGB'), (W, 0))
pv.paste(Image.fromarray((depth * 255).astype(np.uint8)).convert('RGB'), (W * 2, 0))
pv.save(preview)
print('ok', W, H, f'fg coverage {hard.mean():.2f}')
