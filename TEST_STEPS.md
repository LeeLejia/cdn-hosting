# 临时分支测试过程 - 文件列表

**测试分支**: `test-temp-1763355909`  
**测试仓库**: `LeeLejia/cdn-hosting`  
**测试目录**: `test-dir/`

---

## 步骤1: 初始上传

**命令**:
```bash
node dist/index.js test-upload -t <token> -r LeeLejia/cdn-hosting -b test-temp-1763355909 --prefix test-dir
```

**上传的文件**:
- test1.txt
- test2.txt  
- test.js

**上传后的文件列表**:

### 仓库根目录
```
📄 .gitkeep (0 bytes)
📁 test-dir/
```

### test-dir/ 目录
```
📄 test-dir/test1.txt (14 bytes)
📄 test-dir/test2.txt (14 bytes)
📄 test-dir/test.js (21 bytes)
```

**提交记录**:
- `[e16f526] 占位空提交`
- `[211df2e] Upload test-dir/test2.txt`
- `[b1d308f] Upload test-dir/test1.txt`
- `[d791800] Upload test-dir/test.js`

---

## 步骤2: Force上传（仅删除prefix目录内容）

**命令**:
```bash
node dist/index.js test-upload -t <token> -r LeeLejia/cdn-hosting -b test-temp-1763355909 --prefix test-dir -f
```

**操作说明**:
- 使用 `-f` (force) 选项
- 指定 `--prefix test-dir`
- **仅删除 test-dir 目录下的内容**，保留分支其他文件（如 .gitkeep）

**上传的文件**:
- test1.txt (更新内容)
- test2.txt
- test3.txt (新增)
- test.js
- newfile.txt (新增)

**Force上传后的文件列表**:

### 仓库根目录
```
📄 .gitkeep (0 bytes)  ← 保留，未删除
📁 test-dir/
```

### test-dir/ 目录
```
📄 test-dir/newfile.txt (16 bytes)
📄 test-dir/test.js (21 bytes)
📄 test-dir/test1.txt (22 bytes)  ← 内容已更新
📄 test-dir/test2.txt (14 bytes)
📄 test-dir/test3.txt (19 bytes)
```

**提交记录**:
- `[f011969] Delete file test-dir/test1.txt`  ← 删除旧文件
- `[0862982] Delete file test-dir/test.js`   ← 删除旧文件
- `[59f7e78] Upload test-dir/test3.txt`      ← 上传新文件
- `[6fe60bd] Upload test-dir/test2.txt`      ← 重新上传
- `[4dc9314] Upload test-dir/test1.txt`       ← 重新上传（更新内容）
- `[5a38c07] Upload test-dir/test.js`          ← 重新上传
- `[5967eab] Upload test-dir/newfile.txt`     ← 上传新文件

**验证结果**: ✅ 
- test-dir 目录下的旧文件被删除
- 新文件成功上传
- 仓库根目录的 .gitkeep 文件保留（符合预期：仅删除prefix目录内容）

---

## 步骤3: 删除指定文件

**命令**:
```bash
node -e "const {CdnUploader} = require('./dist/index.js'); 
const u = new CdnUploader({token: '<token>', repo: 'LeeLejia/cdn-hosting'}); 
u.deleteFile('test-dir/test2.txt', 'test-temp-1763355909');"
```

**操作说明**:
- 使用 `deleteFile` API 删除指定文件
- 删除文件: `test-dir/test2.txt`

**删除后的文件列表**:

### 仓库根目录
```
📄 .gitkeep (0 bytes)
📁 test-dir/
```

### test-dir/ 目录
```
📄 test-dir/newfile.txt (16 bytes)
📄 test-dir/test.js (21 bytes)
📄 test-dir/test1.txt (22 bytes)
📄 test-dir/test3.txt (19 bytes)
```

**提交记录**:
- `[84fd036] Delete file test-dir/test2.txt`

**验证结果**: ✅ 
- test2.txt 已成功删除
- 其他文件保持不变

---

## 最终状态

**当前文件列表**:

### 仓库根目录
```
📄 .gitkeep (0 bytes)
📁 test-dir/
```

### test-dir/ 目录
```
📄 test-dir/newfile.txt (16 bytes)
📄 test-dir/test.js (21 bytes)
📄 test-dir/test1.txt (22 bytes)
📄 test-dir/test3.txt (19 bytes)
```

**总计**: 
- 仓库根目录: 2 个文件/目录（.gitkeep + test-dir）
- test-dir 目录: 4 个文件

---

## 功能验证总结

✅ **上传功能**: 正常，文件成功上传到指定目录  
✅ **Force功能（prefix模式）**: 正常，仅删除prefix目录内容，保留分支其他文件  
✅ **删除文件功能**: 正常，可以成功删除指定文件
