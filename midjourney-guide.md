# Midjourney 使用教程
## ThinkForge 宠物概念图生成指南

---

## 一、什么是 Midjourney？

Midjourney 是目前最强的 AI 图像生成工具之一，输入文字描述（prompt），几十秒内生成高质量插画、概念艺术、游戏原画等。非常适合用来快速验证视觉方向，不需要任何绘画基础。

---

## 二、如何访问 Midjourney

### 方式 A：网页版（推荐新手）
1. 打开 [midjourney.com](https://www.midjourney.com)
2. 点击右上角 **Sign In**，用 Google 账号或邮箱注册
3. 登录后进入 **Explore** 页面，点击左侧 **Create** 开始生成
4. 在底部输入框输入 prompt，按回车即可

### 方式 B：Discord 版（功能更完整）
1. 注册 Discord 账号：[discord.com](https://discord.com)
2. 加入 Midjourney 官方服务器：[discord.gg/midjourney](https://discord.gg/midjourney)
3. 在任意 `#newbies` 频道输入 `/imagine` 开始使用

> **注意：** Midjourney 需要订阅付费计划才能使用。基础计划约 $10/月，可生成约 200 张图。建议先订阅一个月试试看。

---

## 三、基础使用方法

### 输入 prompt 的格式

```
/imagine prompt: [画面描述], [风格描述], [技术参数]
```

### 一个简单例子

```
/imagine prompt: a glowing crystal creature in misty forest, watercolor style, soft colors --ar 3:4 --v 6
```

生成后会出现 **4 张候选图**，你可以：
- 点击 **U1~U4**：放大某张图（Upscale）
- 点击 **V1~V4**：基于某张图生成更多变体（Variation）
- 点击 **刷新图标**：重新生成全部 4 张

---

## 四、常用参数说明

| 参数 | 含义 | 示例 |
|------|------|------|
| `--ar 3:4` | 图片比例（宽:高），手机竖屏用 3:4 | `--ar 1:1` 正方形 |
| `--v 6` | 使用第 6 版模型（最新最强） | `--v 6.1` |
| `--style raw` | 减少 AI 自动美化，更接近你的描述 | |
| `--q 2` | 提高生成质量（耗更多算力） | |
| `--no text` | 不要在画面中出现文字 | |
| `--s 500` | 风格化强度，0~1000，越高越有艺术感 | |

---

## 五、ThinkForge 宠物概念图 Prompt

### Concept ② 迷雾生物

```
a tiny luminous humanoid figure made of translucent crystal shards,
body dissolving into soft mist at the edges, cradled in a massive
crumbling ancient stone hand, large watercolor background wash
transitioning from warm coral pink to pale teal blue, delicate
twisting vines with small leaves, floating golden light particles,
ethereal and mysterious atmosphere, the feeling of being seen for
the first time, detailed painterly illustration, fantasy concept art,
Gris game art style, soft lighting, no text
--ar 3:4 --v 6 --style raw --s 600
```

**调整建议：**
- 想更神秘：加 `dark atmosphere, deep shadows`
- 想更温柔：加 `warm soft light, pastel tones`
- 想更精细：加 `highly detailed, intricate details, 4k`

---

### Concept ③ 活体星球

```
a small detailed living planet floating in dark space, surface with
hand-painted textures, one side covered in lush glowing forest with
tiny paper lanterns and ancient Chinese architecture, other side with
dramatic mountain ranges and floating ancient scrolls and calligraphy,
translucent orbit ring engraved with fine runes and symbols, deep
indigo and gold color palette, East Asian ink painting meets fantasy
illustration, Onmyoji game art style, intricate details, dramatic
lighting, no text
--ar 3:4 --v 6 --s 700
```

**调整建议：**
- 想更东方：加 `traditional Chinese painting influence, ink wash`
- 想更宇宙感：加 `nebula background, star field, cosmic`
- 想看不同地貌：把 `forest` 换成 `desert, crystal caves, tundra`

---

## 六、让结果更接近你想要的技巧

### 1. 用参考图引导风格（图生图）
在 Discord 版，输入 prompt 前先粘贴一张参考图的 URL：
```
/imagine prompt: [参考图URL] a glowing creature, [其他描述] --v 6
```
AI 会模仿参考图的构图和色调。

### 2. 锁定某张图继续生成
点击 **V1~V4** 生成变体时，加上 `--style [seed数字]` 可以保持同一个风格方向持续迭代。

### 3. Prompt 结构公式

```
[主体描述] + [环境/背景] + [色调/光线] + [艺术风格] + [参考作品] + [技术参数]
```

好的 prompt 就像写导演备注：主角是谁，在哪里，什么感觉，像谁的画风。

### 4. 常用风格关键词

| 效果 | 关键词 |
|------|--------|
| 游戏原画感 | `game concept art, character design sheet` |
| 水彩插画 | `watercolor illustration, soft wash, painterly` |
| 东方风格 | `Chinese ink painting, wuxia, Onmyoji style` |
| 精细细节 | `highly detailed, intricate, 4k, sharp focus` |
| 梦幻氛围 | `ethereal, dreamy, soft light, magical atmosphere` |
| 孤独感 | `tiny figure in vast landscape, sense of scale` |

---

## 七、版权说明

- Midjourney 生成的图片，订阅用户拥有使用权，可用于商业项目
- 不要直接使用他人游戏（如阴阳师）的角色作为参考图——描述画风即可，避免侵权纠纷
- App Store 上架的素材建议用自己生成并修改的图，或委托画师二次创作

---

## 八、下一步建议

1. 先用上面两个 prompt 各生成一轮（各 4 张）
2. 挑出最接近感觉的那张，用 **V** 继续迭代
3. 两个方向都跑完之后，看哪个更打动你，再决定宠物方向
4. 确定方向后，可以进一步生成：不同表情、不同状态（刚出生/成长中/完全解锁）的版本

---

*文档生成于 ThinkForge 项目规划阶段 · 2026.04*
