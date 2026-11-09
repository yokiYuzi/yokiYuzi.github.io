# Jade Veil · 玉幕 — 接入说明

把本压缩包里的文件按相同路径放进 `yokiyuzi.github.io` 仓库根目录即可：

| 文件 | 作用 |
|---|---|
| `js/jade-veil.js` | 3D 场景本体（幕布、玉纹 shader、金线、月亮、相机路径） |
| `js/jade-veil-boot.js` | 首页启动脚本：插入 canvas、阅读遮罩、进度线、文字滑入 |
| `css/jade-veil.css` | 只在 `html.veil-on` 时生效的样式；WebGL 不可用时页面保持原样 |
| `js/vendor/three.module.min.js` | three.js r170（MIT），同源加载，不依赖 CDN |
| `index.html` | 只多了 3 行：一个 stylesheet、一个 importmap、一个 module script |

## 常用调节点（都在 `js/jade-veil.js`）

- `STOPS`：每个章节对应的相机机位 `[眼睛位置, 看向的点, 视角 fov, 画面右移量]`。
- `curtain({...})`：每块幕布的位置、宽度、朝向、颜色，以及 `open: [开始, 结束]`——它在第几章被拉开。
- `U.uFlow.value += dt * (0.35 + vel * 6.0)`：0.35 是静止时玉纹的流速，6.0 是滚轮带动流速的力度。
- `wTarget = Math.min(1.4, Math.abs(vel) * 2.2)`：滚动产生的“风”有多大。
- `uv = vLocal*0.085`（片元着色器）：玉纹的尺度，越小纹路越大越柔。

## 性能与无障碍

- 设备像素比上限 1.75；帧时间偏长时自动降分辨率；静止时降到 30fps；页面不可见时停止渲染。
- `prefers-reduced-motion`：不播放开场、不随滚动加风、无惯性。
- 无 WebGL：不加 `veil-on`，原来的静态玉石插画照常显示。

## 仓库接入说明

- 保留现有随机语录、导航、文章列表和静态插画；仅在首页加载玉幕。
- 自适应清晰度仅采样非静止帧，避免把主动限制到 30fps 误判为性能不足。
- 切换标签页时取消待执行的动画帧，返回后恢复；减少动态效果时章节导航直接跳转。
- 打印时关闭画布和文字入场效果，保证所有章节可见。
- Three.js r170 和噪声算法的 MIT 许可随代码保存在 `js/vendor/three-LICENSE.txt` 与 `js/vendor/webgl-noise-LICENSE.txt`。
