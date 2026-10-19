# 发布动态照片

将 `.livp` 文件放在这个目录（可建子目录），提交到 `master`。网站的 **Build and deploy website** 工作流会自动生成照片与视频，并展示在 `/column/#live-photos`。文件扩展名大小写均可；中文、空格文件名均可。

每个 LIVP 应为 ZIP 包，内含一张 HEIC/HEIF/JPEG/PNG 照片及一个 MOV/MP4/M4V 视频。原包保留下载，网页另外提供完整像素尺寸的 JPEG、整段 H.264 视频和 AAC 音频。页面等比显示，不裁切；点击 **Play Live Photo** 播放，使用视频控制条调节声音或全屏，点击 **Full-size photo** 查看静态照片。

可选：在同目录放同名 `.json`，例如 `海边.livp` 配 `海边.json`：

```json
{
  "title": "海边的傍晚",
  "caption": "海风与浪声。",
  "date": "2026-10-18",
  "alt": "夕阳下的海岸与拍打礁石的海浪"
}
```

不写 JSON 时以文件名作为标题。照片按 `date` 倒序、再按标题排序。预览会转码，因此不是原始文件的无损替代：HDR 视频转换成 SDR 以便跨浏览器观看，原始 HDR、元数据及苹果专有编辑效果保留在 `.livp` 原包中。此目录的文件会公开发布。

损坏、缺少组件或包含多组照片的 LIVP 会使构建失败，并显示文件名；原有线上版本保持不变。GitHub 单文件大小限制仍适用。

## 本地构建

安装 Python 3.12+、FFmpeg（含 ffprobe），执行：

```sh
python -m pip install -r tools/requirements-livephotos.txt
python -m unittest discover -s tests -v
python tools/build_site.py --output _site
python -m http.server 8000 --directory _site
```

也可用 `FFMPEG` / `FFPROBE` 环境变量指定可执行文件路径。构建目录须为空；生成文件不用提交。GitHub Pages 使用仓库的 Actions 工作流部署。

处理实现参考：[Apple LivePhotosKit](https://developer.apple.com/documentation/LivePhotosKitJS)、[pillow-heif](https://pillow-heif.readthedocs.io/en/latest/)、[FFmpeg](https://ffmpeg.org/ffmpeg.html)。

## Attach Live Photos to an essay

Add `"article": "/column/posts/your-slug/"` to a photo's JSON sidecar to include it in that essay as well as the column gallery. The article must contain one `<!-- LIVE_PHOTOS_START -->` / `<!-- LIVE_PHOTOS_END -->` pair and load `/css/livephotos.css` and `/js/livephotos.js`.
