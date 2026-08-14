# 贡献指南

感谢你对星川威胁情报助手的兴趣！我们欢迎各种形式的贡献。

## 🐛 报告 Bug

1. 在 [Issues](https://github.com/xingchuan/xingchuan-ti/issues) 中搜索是否已有类似问题
2. 如果没有，创建新 Issue，包含：
   - 问题描述
   - 复现步骤
   - 期望行为 vs 实际行为
   - 浏览器版本、操作系统
   - 截图（如有）

## 💡 功能建议

1. 在 [Issues](https://github.com/xingchuan/xingchuan-ti/issues) 中创建新 Issue
2. 描述你想要的功能
3. 说明使用场景
4. 如果可能，提供设计草图

## 🔧 代码贡献

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/xingchuan/xingchuan-ti.git
cd xingchuan-ti

# 安装依赖
npm install

# 开发模式
npm run dev

# 加载扩展
# Chrome → chrome://extensions → 开发者模式 → 加载已解压 → 选择 .output/chrome-mv3
```

### 代码规范

- 使用 TypeScript
- 遵循现有代码风格
- 添加必要的注释
- 确保 `npm run typecheck` 通过
- 确保 `npm test` 通过

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链

示例：
```
feat(adapters): 添加 AbuseIPDB 适配器
fix(detect): 修复 IPv6 识别误判
docs(readme): 更新安装说明
```

### Pull Request 流程

1. Fork 仓库
2. 创建功能分支：`git checkout -b feat/my-feature`
3. 提交更改：`git commit -m "feat: 添加 xxx"`
4. 推送分支：`git push origin feat/my-feature`
5. 创建 Pull Request
6. 等待 review 和合并

### 添加新情报源

1. 在 `src/adapters/` 下创建新文件，实现 `Adapter` 接口
2. 在 `src/adapters/index.ts` 中注册
3. 在 `src/lib/storage.ts` 的 `DEFAULT_SETTINGS` 中添加默认配置
4. 在 `src/lib/platforms.ts` 中添加跳转配置（如有 web 页面）
5. 添加适配器单测
6. 更新 README 的情报源列表

### 测试

```bash
npm test                # 逻辑单测
npm run test:adapters   # 适配器单测
npm run test:e2e        # 真实扩展 E2E（需桌面 GUI）
npm run typecheck       # TypeScript 类型检查
```

## 📄 许可证

贡献的代码将在 [MIT 许可证](LICENSE) 下发布。

## 🙏 致谢

感谢所有贡献者！
