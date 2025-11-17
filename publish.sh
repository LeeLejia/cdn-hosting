#!/bin/bash
# NPM 发布脚本

echo "=========================================="
echo "准备发布 github-cdn-uploader@1.1.0"
echo "=========================================="

# 检查是否已登录
if ! npm whoami &>/dev/null; then
    echo ""
    echo "⚠️  需要先登录 npm"
    echo "请执行以下命令登录："
    echo "  npm login"
    echo ""
    echo "或者使用以下凭据："
    echo "  用户名: cjwddz"
    echo "  密码: imjia123456"
    echo ""
    read -p "按回车键继续（如果已登录）..."
fi

# 检查登录状态
if npm whoami &>/dev/null; then
    echo "✅ 已登录为: $(npm whoami)"
else
    echo "❌ 未登录，请先执行: npm login"
    exit 1
fi

# 检查当前版本
CURRENT_VERSION=$(npm view github-cdn-uploader version 2>/dev/null || echo "未发布")
echo "📦 当前npm上的版本: $CURRENT_VERSION"
echo "📦 准备发布的版本: 1.1.0"

# 确认发布
read -p "确认发布? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消发布"
    exit 1
fi

# 构建
echo ""
echo "🔨 构建项目..."
npm run build

# 发布
echo ""
echo "🚀 发布到 npm..."
npm publish

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 发布成功！"
    echo "📦 包地址: https://www.npmjs.com/package/github-cdn-uploader"
else
    echo ""
    echo "❌ 发布失败"
    exit 1
fi
