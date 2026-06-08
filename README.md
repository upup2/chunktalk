# 🗣️ ChunkTalk — 像美国人一样脱口而出

一个帮助你用地道美式英语脱口而出的学习工具。

## 核心理念

**Chunk 学习法**：把中国人日常常说的话 → 翻译成美国人最常用的地道表达 → 配合 B 站真实场景视频理解语境。

不用背单词、不用学语法，直接学"美国人会怎么说"。

## 功能

- 🔍 **中文搜索**：输入中文，找到对应的地道美式表达
- 📊 **概率排序**：最常见（80%+）的表达优先展示
- 👈 **左右滑动**：切换不同表达方式
- 🎬 **B 站视频**：嵌入真实场景片段，看美国人怎么说
- ✅ **学习记录**：标记已学，跟踪进度
- 📱 **移动端优先**：手机上完美体验

## 本地运行

```bash
# 用任意静态服务器启动
npx serve .
# 或
python -m http.server 8000

# 浏览器打开 http://localhost:3000
```

## 内容格式

在 `chunks.json` 中添加新内容：

```json
{
  "id": "c001",
  "chinese": "你这几天在干嘛",
  "category": ["社交", "日常"],
  "frequency": "high",
  "expressions": [
    {
      "text": "What have you been up to?",
      "usageProbability": 90,
      "context": "朋友见面寒暄，最常用的说法",
      "tone": "casual",
      "video": {
        "bvid": "BV1xx411x7xx",
        "startTime": 12,
        "endTime": 25,
        "title": "视频标题"
      }
    }
  ]
}
```

## 部署

静态网站，推送 GitHub 后导入 Vercel/Netlify 即可上线。

## 路线图

- [ ] AI 动态生成地道表达
- [ ] B 站视频时间戳自动匹配
- [ ] 用户发音评测
- [ ] 间隔复习提醒
- [ ] 社区内容贡献
