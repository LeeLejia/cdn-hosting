# NPM 自动发布指南

本项目配置了 GitHub Actions 来自动构建和发布 npm 包。

## 发布方式

### 方式1: 推送版本标签（推荐）

1. **更新版本号**
   ```bash
   # 在 package.json 中更新版本号，例如 1.1.0
   ```

2. **提交并推送代码**
   ```bash
   git add .
   git commit -m "chore: bump version to 1.1.0"
   git push
   ```

3. **创建并推送版本标签**
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **自动触发发布**
   - GitHub Actions 会自动检测到版本标签
   - 自动构建项目
   - 自动发布到 npm
   - 自动创建 GitHub Release

### 方式2: 手动触发（GitHub Actions UI）

1. 访问 GitHub 仓库的 **Actions** 页面
2. 选择 **Manual Publish** 工作流
3. 点击 **Run workflow**
4. 输入版本号（例如：`1.1.0`）
5. 选择是否发布（`yes`）
6. 点击 **Run workflow** 按钮

## 配置要求

### 1. 设置 NPM Token

在 GitHub 仓库中设置 NPM_TOKEN secret：

1. 访问仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 名称：`NPM_TOKEN`
4. 值：你的 npm access token

#### 如何获取 NPM Token：

**方法1: 使用 npm 账号密码创建 token**
```bash
npm login
npm token create --read-only=false
```

**方法2: 通过 npm 网站创建**
1. 访问 https://www.npmjs.com/settings/cjwddz/tokens
2. 点击 **Generate New Token**
3. 选择 **Automation** 类型
4. 复制生成的 token

**方法3: 使用现有 token**
如果你已经有 npm token，直接使用即可。

### 2. 验证配置

推送一个测试标签来验证配置：
```bash
git tag v1.0.0-test
git push origin v1.0.0-test
```

然后在 GitHub Actions 页面查看工作流是否成功运行。

## 工作流说明

### CI 工作流 (`.github/workflows/ci.yml`)
- **触发**: 每次 push 到 main/develop 分支或创建 PR
- **作用**: 自动构建和测试代码
- **不发布**: 仅用于验证代码质量

### 发布工作流 (`.github/workflows/publish.yml`)
- **触发**: 推送版本标签（v*.*.*）或手动触发
- **作用**: 
  - 构建项目
  - 更新版本号
  - 发布到 npm
  - 创建 GitHub Release

### 手动发布工作流 (`.github/workflows/publish-manual.yml`)
- **触发**: 手动触发（workflow_dispatch）
- **作用**: 允许通过 GitHub UI 手动发布指定版本

## 发布检查清单

发布前请确认：

- [ ] 代码已通过所有测试
- [ ] 版本号已更新（package.json）
- [ ] CHANGELOG.md 已更新（如果有）
- [ ] README.md 已更新（如果有新功能）
- [ ] NPM_TOKEN secret 已配置
- [ ] 已提交所有更改

## 故障排查

### 发布失败：认证错误
- 检查 NPM_TOKEN secret 是否正确配置
- 确认 token 有发布权限

### 发布失败：版本已存在
- 检查 npm 上是否已存在该版本
- 更新到新版本号

### 工作流未触发
- 检查标签格式是否为 `v*.*.*`（例如 v1.1.0）
- 确认工作流文件路径正确：`.github/workflows/publish.yml`

## 当前配置

- **Node.js 版本**: 22
- **npm 注册表**: https://registry.npmjs.org
- **包名**: github-cdn-uploader
- **当前版本**: 1.1.0
