# 摄影Gallery - 照片尺寸对照表

## 📸 需要准备的照片尺寸

根据你的Figma设计，你需要准备26张照片，分为两种尺寸：

### 小照片（横版）- 590 x 395 像素
photo-2.jpg
photo-3.jpg
photo-4.jpg
photo-5.jpg
photo-6.jpg
photo-7.jpg
photo-8.jpg
photo-10.jpg
photo-11.jpg
photo-12.jpg
photo-13.jpg
photo-15.jpg
photo-16.jpg
photo-18.jpg
photo-19.jpg
photo-20.jpg
photo-23.jpg
photo-24.jpg
photo-25.jpg
photo-26.jpg

### 大照片（竖版）- 595 x 885 像素
photo-1.jpg
photo-9.jpg
photo-14.jpg
photo-17.jpg
photo-21.jpg
photo-22.jpg

---

## 🛠️ 使用步骤

### 1. 裁剪照片

使用任何工具（Photoshop/Lightroom/在线工具）把照片裁成上面的尺寸：

**Photoshop快速裁剪：**
```
1. 打开照片
2. 按 C 键（裁剪工具）
3. 顶部输入尺寸：
   - 小照片：590 px x 395 px
   - 大照片：595 px x 885 px
4. 调整裁剪框到最佳构图
5. 按回车确认
6. 文件 → 导出 → 存储为Web所用格式
7. 质量选80%
```

**在线工具：**
- Squoosh.app (Google出品，免费)
- TinyPNG.com (压缩+裁剪)
- Photopea.com (免费在线PS)

### 2. 命名照片

严格按照这个格式命名：
```
photo-1.jpg
photo-2.jpg
photo-3.jpg
...
photo-26.jpg
```

### 3. 上传照片

把26张照片上传到你的网站：
```
方式A：放在 public/photos/ 文件夹
你的项目/
  └── public/
      └── photos/
          ├── photo-1.jpg
          ├── photo-2.jpg
          └── ...

方式B：上传到Cloudflare R2
然后获取每张照片的URL
```

### 4. 修改代码中的路径

**如果使用本地存储（public文件夹）：**
不用改，代码里已经写好了 `/photos/photo-1.jpg`

**如果使用Cloudflare R2或其他CDN：**
修改 gallery-page.tsx 里的 src 路径：
```typescript
const photos = [
  { 
    id: 1, 
    src: 'https://你的域名.com/photo-1.jpg', // 改这里
    size: 'large', 
    alt: '照片1描述' 
  },
  // ... 其他照片
];
```

### 5. 导入CSS

在你的 Remix 根文件（app/root.tsx）里导入CSS：
```typescript
import galleryStyles from '~/styles/gallery.css';

export const links = () => [
  { rel: 'stylesheet', href: galleryStyles },
];
```

### 6. 访问页面

启动开发服务器：
```bash
npm run dev
```

访问：http://localhost:3000/gallery

---

## 🎨 自定义

### 修改间距
在 gallery.css 里找到：
```css
.gallery-grid {
  gap: 7px; /* 改这个数字 */
}
```

### 修改悬停效果
在 gallery.css 里找到：
```css
.gallery-item:hover img {
  transform: scale(1.05); /* 改放大倍数 */
}
```

### 添加lightbox（点击放大）
需要安装库：
```bash
npm install yet-another-react-lightbox
```

然后修改组件（我可以帮你写）

---

## 📊 照片分布图（对照Figma）

```
第一列：        第二列：        第三列：
photo-1 (大)    photo-10 (小)   photo-19 (小)
photo-2 (小)    photo-11 (小)   photo-20 (小)
photo-3 (小)    photo-12 (小)   photo-21 (大)
photo-4 (小)    photo-13 (小)   photo-22 (大)
photo-5 (小)    photo-14 (大)   photo-23 (小)
photo-6 (小)    photo-15 (小)   photo-24 (小)
photo-7 (小)    photo-16 (小)   photo-25 (小)
photo-8 (小)    photo-17 (大)   photo-26 (小)
photo-9 (大)    photo-18 (小)
```

---

## ⚡ 性能优化建议

1. **压缩照片**
   - 用TinyPNG压缩，保持质量80%
   - 590x395的照片 → 压缩后约50-80KB
   - 595x885的照片 → 压缩后约100-150KB

2. **懒加载**
   - 代码里已经加了 `loading="lazy"`
   - 照片会在滚动到时才加载

3. **WebP格式**（可选）
   - 更小的文件体积
   - 需要准备两份：.jpg（兼容）+ .webp（现代浏览器）

---

## 🐛 常见问题

**Q: 照片变形了？**
A: 检查照片尺寸是否正确。必须严格按590x395或595x885裁剪。

**Q: 照片加载很慢？**
A: 用TinyPNG压缩照片，单张不要超过200KB。

**Q: 手机上布局乱了？**
A: CSS已经写好响应式，检查是否正确导入了gallery.css。

**Q: 想改成4列布局？**
A: 修改CSS里的 `grid-template-columns: repeat(3, 1fr)` 改成 `repeat(4, 1fr)`

---

## ✅ 检查清单

- [ ] 26张照片都裁好了
- [ ] 照片已压缩（每张<200KB）
- [ ] 照片已上传到正确位置
- [ ] CSS文件已导入到root.tsx
- [ ] 路由文件已放在routes文件夹
- [ ] 本地测试通过
- [ ] 照片路径都正确

---

需要帮助？直接问我！

