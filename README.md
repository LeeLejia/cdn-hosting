# CDN Uploader

一个用于将文件上传到 jsDelivr CDN 的命令行工具，同时支持在 Node 程序中引入。

## 安装

```bash
npm install -g github-cdn-uploader
```

## 使用方法

### 基本用法示例

```js
import { CdnUploader } from 'github-cdn-uploader';

// 创建上传器实例
const uploader = new CdnUploader({
  token: 'your_github_token',  // GitHub 个人访问令牌
  repo: 'username/repo',       // GitHub 仓库
  pattern: '**/*',            // 可选：文件匹配模式
  exclude: '*.log,temp/**',   // 可选：排除的文件
  prefix: 'assets',           // 可选：文件路径前缀
  branch: 'cdn-assets',       // 可选：目标分支
  force: false               // 可选：是否强制覆盖
});

// 上传文件
async function uploadFiles() {
  try {
    // 指定上传目录
    const result = await uploader.uploadDirectory('./dist');
    
    // result 包含以下信息：
    console.log('上传的文件列表：', result.files);
    console.log('文件访问 URL：', result.urls);
    console.log('基础访问路径：', result.baseUrl);
    console.log('GitHub 仓库分支：', result.gitUrl);
  } catch (error) {
    console.error('上传失败：', error);
  }
}

uploadFiles();
```

### 命令行使用

基本用法：

```bash
cdnuploader <directory> -t <github_token> -r <repo> [options]
```

### 必选参数

- `<directory>`: 要上传的目录路径（相对于当前执行命令的目录）
- `-t, --token <token>`: GitHub 个人访问令牌
- `-r, --repo <repo>`: GitHub 仓库（格式：用户名/仓库名）

### 可选参数

- `-p, --pattern <pattern>`: 文件匹配模式，例如："**/*.js"
- `-e, --exclude <pattern>`: 要排除的文件模式，多个模式用逗号分隔，例如："*.txt,*.log,temp/**"
- `--prefix <prefix>`: 文件路径前缀，用于在 CDN URL 中添加前缀路径
- `-b, --branch <branch>`: 指定上传的目标分支，不指定则自动创建新分支
- `-f, --force`: 启用强制覆盖模式，上传后会覆盖目标分支只保留当前上传的文件

## 使用示例

1. 上传当前目录下所有文件到自己的仓库，并保存在自动生成的分支
```bash
cdnuploader . -t ghp_xxxxxxxxxxxxxxxxxxxx -r "你的用户名/你的仓库名"
```

2. 上传指定目录下的文件
```bash
cdnuploader ./dist -t ghp_xxxxxxxxxxxxxxxxxxxx -r "你的用户名/你的仓库名"
```

3. 只上传 JavaScript 文件
```bash
cdnuploader ./src -t ghp_xxxxxxxxxxxxxxxxxxxx -r "你的用户名/你的仓库名" -p "**/*.js"
```

4. 上传到指定分支，如果分支不存在，则自动创建分支
```bash
cdnuploader ./dist -t ghp_xxxxxxxxxxxxxxxxxxxx -r "你的用户名/你的仓库名" -b "cdn-assets"
```

5. 使用前缀，上传的所有文件会放在指定前缀的目录下
```bash
cdnuploader ./assets -t ghp_xxxxxxxxxxxxxxxxxxxx -r "你的用户名/你的仓库名" --prefix "v1/images"
```

6. 强制更新，将移除指定分支的其他文件，只保留当前上传的文件（删除文件时，CDN 同步不会很及时）
```bash
cdnuploader ./dist -t ghp_xxxxxxxxxxxxxxxxxxxx -r "你的用户名/你的仓库名" -b "main" -f
```

## 获取 GitHub Token

1. 访问 GitHub 设置页面：https://github.com/settings/tokens
2. 点击右上角的 "Generate new token (classic)" 按钮
3. 在 "Select scopes" 部分，勾选 "repo" 权限（这将授予对仓库的完全访问权限）

## GitHub 仓库
私有仓库生成的 CDN 链接不支持访问，建议新建独立的公开仓库用于维护 CDN 文件，应避免上传敏感文件。