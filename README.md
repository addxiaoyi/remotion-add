# VisualForge Studio

基于 [Remotion](https://remotion.dev) 深度中文化改造的可视化视频创作工作台。

React 代码即视频 —— 用组件的方式创作视频，预览、编辑、渲染一站式完成。

## ✨ 特性

- **完整中文界面** —— 菜单、时间线、属性面板、渲染、设置、通知、错误提示全部中文化
- **可视化编辑** —— 时间线拖拽、逐帧预览、属性实时调整、关键帧缓动编辑
- **智能创作助手** —— 自然语言描述需求，自动应用参数修改（SaaS 模式）
- **字幕与语音** —— 内置 Whisper 转录、字幕编辑、背景移除
- **多端渲染** —— 本地渲染 / 浏览器端渲染 / 云端渲染（Lambda、CloudRun、Vercel）
- **效果库** —— 内置数十种效果、转场、LUT 调色、曲线控制

## 🚀 快速开始

```bash
# 安装依赖（需要 Bun >= 1.4.3）
bun install

# 构建核心包
bun run build-fast

# 启动开发环境（示例项目）
cd packages/example
bunx remotion studio
```

浏览器打开 `http://localhost:3000` 即可使用。

## 🧩 SaaS 模式

本项目内置 SaaS 部署模式，启用后自动隐藏许可证限制的功能入口：

```js
// 桌面端 / 宿主应用注入
window.remotion_saasMode = true;
// 或 URL 参数
http://localhost:3000?saas=1
```

SaaS 模式下禁用：下载工程源码、外部 AI 智能体接入、npm 包安装、第三方元素库、原生代码重构入口。

替代能力（`saas-features.ts` / `SaasAssistantModal.tsx`）：
- **作品导出** —— 导出渲染成品 + 模板参数 JSON（不含代码）
- **创作助手 API** —— 服务端 AI 将自然语言约束为结构化参数操作

## 📦 目录结构

```
packages/
├── studio          # 可视化编辑器（本项目核心汉化对象）
├── core            # remotion 核心库
├── cli             # 命令行工具
├── player          # 可嵌入播放器
├── renderer        # 服务端渲染
├── lambda          # AWS Lambda 分布式渲染
└── ...             # 100+ 配套包
```

## 🛠️ 常用命令

```bash
bun run build-fast        # 快速构建（跳过部分重型包）
bun run watchcore         # 监听核心包变更
bun run watchstudio       # 监听 Studio 变更
bun run test              # 运行测试
bunx turbo run make --filter='@remotion/studio'   # 只构建 Studio
```

## 📄 许可证

本项目基于 Remotion 源码，遵循 [Remotion License](LICENSE.md)：

- 个人及 ≤3 人团队可免费商用
- 更大规模的组织需获取 [Remotion Company License](https://www.remotion.pro/license)
- 请勿将本项目的 Remotion 源码本身作为产品出售

## 🙏 致谢

- [Remotion](https://remotion.dev) — Remotion AG 及社区贡献者
