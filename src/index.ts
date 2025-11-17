#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { Octokit } from '@octokit/rest';

export interface UploadOptions {
  pattern?: string;
  exclude?: string;
  token?: string;
  prefix?: string;
  repo?: string;
  branch?: string;
  force?: boolean;
}

export class CdnUploader {
  private defaultRepo = 'LeeLejia/cdn-hosting';
  private options: UploadOptions;

  constructor(options: UploadOptions = {}) {
    this.options = {
      ...options,
      repo: options.repo || this.defaultRepo
    };
  }

  async uploadDirectory(directory: string): Promise<{ files: string[]; urls: { [key: string]: string }; baseUrl: string; gitUrl: string }> {
    const absolutePath = path.resolve(directory);
    if (!fs.existsSync(absolutePath)) {
      throw new Error('指定的目录不存在：' + absolutePath);
    }

    const pattern = this.options.pattern || '**/*';
    const files = await glob(pattern, {
      cwd: absolutePath,
      ignore: this.options.exclude ? this.options.exclude.split(',') : [],
      nodir: true
    });

    if (files.length === 0) {
      return { files: [], urls: {}, baseUrl: '', gitUrl: '' };
    }

    const branch = await this.uploadToGitHub(files, absolutePath);
    const urls: { [key: string]: string } = {};
    const prefixPath = this.options.prefix ? this.options.prefix.replace(/^\/?|\/?$/g, '') + '/' : '';
    const baseUrl = `https://cdn.jsdelivr.net/gh/${this.options.repo}@${branch}/${prefixPath}`;
    const gitUrl = `https://github.com/${this.options.repo}/tree/${branch}`;

    files.forEach(file => {
      urls[file] = baseUrl + file;
    });

    return { files, urls, baseUrl, gitUrl };
  }

  private async createEmptyBranch(octokit: Octokit, owner: string, repo: string, branchName?: string): Promise<string> {
    try {
      const date = new Date();
      const dateStr = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const generatedBranchName = branchName || `cdn-upload-${dateStr}-${randomNum}`;

      // 创建一个空的 tree
      const { data: { sha: treeSha } } = await octokit.rest.git.createTree({
        owner,
        repo,
        tree: [
          // 添加一个空文件，以确保分支不为空
          {
            mode: '100644',
            path: '.gitkeep',
            type: 'blob',
            content: '',
          }
        ]
      });

      // 创建一个空的 commit
      const { data: { sha: commitSha } } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: '占位空提交',
        tree: treeSha,
        parents: []
      });

      // 创建新分支
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${generatedBranchName}`,
        sha: commitSha
      });

      return generatedBranchName;
    } catch (error) {
      throw new Error(`创建空分支失败: ${(error as Error).message}`);
    }
  }

  private async uploadToGitHub(files: string[], sourceDir: string): Promise<string> {
    if (!this.options.token) {
      throw new Error('需要提供 GitHub token 才能上传文件');
    }

    if (!this.options.repo) {
      throw new Error('需要提供 GitHub 仓库名称，格式为：用户名/仓库名');
    }

    const [owner, repo] = this.options.repo.split('/');
    if (!owner || !repo) {
      throw new Error('GitHub 仓库格式错误，应为：用户名/仓库名');
    }

    const octokit = new Octokit({ auth: this.options.token });
    const targetBranchName = this.options.branch;
    const prefixPath = this.options.prefix ? (this.options.prefix as string).replace(/^\/?|\/?$/g, '') + '/' : '';

    try {
      if (targetBranchName) {
        // 检查目标分支是否存在
        try {
          await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${targetBranchName}`
          });

          if (this.options.force) {
            // 强制覆盖模式
            if (prefixPath) {
              // 如果指定了prefix，仅删除prefix目录下的内容
              await this.deleteDirectoryContents(octokit, owner, repo, targetBranchName, prefixPath);
              // 上传新文件到目标分支
              await this.uploadFiles(octokit, owner, repo, files, sourceDir, prefixPath, targetBranchName);
            } else {
              // 如果没有prefix，删除整个分支并重新创建
              const tempBranch = await this.createEmptyBranch(octokit, owner, repo);
              await this.uploadFiles(octokit, owner, repo, files, sourceDir, prefixPath, tempBranch);

              // 获取临时分支的最新 commit
              const { data: { object: { sha: tempBranchSha } } } = await octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${tempBranch}`
              });

              // 删除原目标分支
              await octokit.rest.git.deleteRef({
                owner,
                repo,
                ref: `heads/${targetBranchName}`
              });

              // 创建新的目标分支
              await octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${targetBranchName}`,
                sha: tempBranchSha
              });

              // 删除临时分支
              await octokit.rest.git.deleteRef({
                owner,
                repo,
                ref: `heads/${tempBranch}`
              });
            }

            return targetBranchName;
          } else {
            // 直接上传到目标分支
            await this.uploadFiles(octokit, owner, repo, files, sourceDir, prefixPath, targetBranchName);
            return targetBranchName;
          }
        } catch (error) {
          // 目标分支不存在，创建新分支
          const newBranch = await this.createEmptyBranch(octokit, owner, repo, targetBranchName);
          await this.uploadFiles(octokit, owner, repo, files, sourceDir, prefixPath, newBranch);
          return newBranch;
        }
      } else {
        // 未指定分支名，创建新分支
        const newBranch = await this.createEmptyBranch(octokit, owner, repo);
        await this.uploadFiles(octokit, owner, repo, files, sourceDir, prefixPath, newBranch);
        return newBranch;
      }
    } catch (error) {
      throw new Error(`GitHub 上传失败: ${(error as Error).message}`);
    }
  }

  private async uploadFiles(octokit: Octokit, owner: string, repo: string, files: string[], sourceDir: string, prefixPath: string, branch: string): Promise<void> {
    // 判断是否为临时分支（分支名是否与options.branch相同）
    const isTargetBranch = branch === this.options.branch;

    for (const file of files) {
      const content = await fs.promises.readFile(path.join(sourceDir, file));
      const targetPath = prefixPath + file;
      
      let sha: string | undefined;
      if (isTargetBranch) {
        try {
          // 检查文件是否存在并获取其sha
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: targetPath,
            ref: branch
          });
          if (!Array.isArray(data)) {
            sha = data.sha;
          }
        } catch (error) {
          // 文件不存在，继续创建
        }
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: targetPath,
        branch,
        content: content.toString('base64'),
        message: `Upload ${targetPath}`,
        ...(sha ? { sha } : {})
      });
    }
  }

  /**
   * 删除指定目录下的所有内容
   */
  private async deleteDirectoryContents(octokit: Octokit, owner: string, repo: string, branch: string, directoryPath: string): Promise<void> {
    try {
      // 获取目录下的所有文件
      const filesToDelete: Array<{ path: string; sha: string }> = [];
      
      // 递归获取目录下的所有文件
      const getDirectoryFiles = async (dirPath: string): Promise<void> => {
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: dirPath,
            ref: branch
          });

          if (Array.isArray(data)) {
            // 是目录，递归处理
            for (const item of data) {
              if (item.type === 'file') {
                filesToDelete.push({ path: item.path, sha: item.sha });
              } else if (item.type === 'dir') {
                await getDirectoryFiles(item.path);
              }
            }
          } else if (data.type === 'file') {
            // 是文件
            filesToDelete.push({ path: data.path, sha: data.sha });
          }
        } catch (error: any) {
          // 目录不存在或为空，忽略错误
          if (error.status !== 404) {
            throw error;
          }
        }
      };

      await getDirectoryFiles(directoryPath);

      // 批量删除文件
      if (filesToDelete.length > 0) {
        // 获取当前分支的最新commit
        const { data: { object: { sha: currentCommitSha } } } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`
        });

        const { data: currentCommit } = await octokit.rest.git.getCommit({
          owner,
          repo,
          commit_sha: currentCommitSha
        });

        // 获取当前tree
        const { data: currentTree } = await octokit.rest.git.getTree({
          owner,
          repo,
          tree_sha: currentCommit.tree.sha,
          recursive: '1'
        });

        // 构建新的tree，排除要删除的文件
        const newTree = currentTree.tree
          .filter((item: any) => {
            // 保留不在删除列表中的文件，或者不在指定目录下的文件
            return !filesToDelete.some(file => file.path === item.path);
          })
          .map((item: any) => ({
            path: item.path,
            mode: item.mode,
            type: item.type,
            sha: item.sha
          }));

        // 创建新的tree
        const { data: { sha: newTreeSha } } = await octokit.rest.git.createTree({
          owner,
          repo,
          tree: newTree
        });

        // 创建新的commit
        const { data: { sha: newCommitSha } } = await octokit.rest.git.createCommit({
          owner,
          repo,
          message: `Delete files in ${directoryPath}`,
          tree: newTreeSha,
          parents: [currentCommitSha]
        });

        // 更新分支引用
        await octokit.rest.git.updateRef({
          owner,
          repo,
          ref: `heads/${branch}`,
          sha: newCommitSha
        });
      }
    } catch (error) {
      throw new Error(`删除目录内容失败: ${(error as Error).message}`);
    }
  }

  /**
   * 删除指定文件
   * @param filePath 要删除的文件路径（相对于仓库根目录）
   * @param branch 分支名称，如果不指定则使用options.branch
   */
  async deleteFile(filePath: string, branch?: string): Promise<void> {
    if (!this.options.token) {
      throw new Error('需要提供 GitHub token 才能删除文件');
    }

    if (!this.options.repo) {
      throw new Error('需要提供 GitHub 仓库名称，格式为：用户名/仓库名');
    }

    const targetBranch = branch || this.options.branch;
    if (!targetBranch) {
      throw new Error('需要指定分支名称才能删除文件');
    }

    const [owner, repo] = this.options.repo.split('/');
    if (!owner || !repo) {
      throw new Error('GitHub 仓库格式错误，应为：用户名/仓库名');
    }

    const octokit = new Octokit({ auth: this.options.token });

    try {
      // 检查文件是否存在
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: targetBranch
      });

      if (Array.isArray(data)) {
        throw new Error(`路径 ${filePath} 是一个目录，不是文件`);
      }

      const fileSha = data.sha;

      // 获取当前分支的最新commit
      const { data: { object: { sha: currentCommitSha } } } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`
      });

      const { data: currentCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      });

      // 获取当前tree
      const { data: currentTree } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: currentCommit.tree.sha,
        recursive: '1'
      });

      // 构建新的tree，排除要删除的文件
      const newTree = currentTree.tree
        .filter((item: any) => item.path !== filePath)
        .map((item: any) => ({
          path: item.path,
          mode: item.mode,
          type: item.type,
          sha: item.sha
        }));

      // 创建新的tree
      const { data: { sha: newTreeSha } } = await octokit.rest.git.createTree({
        owner,
        repo,
        tree: newTree
      });

      // 创建新的commit
      const { data: { sha: newCommitSha } } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `Delete file ${filePath}`,
        tree: newTreeSha,
        parents: [currentCommitSha]
      });

      // 更新分支引用
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
        sha: newCommitSha
      });
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`文件 ${filePath} 不存在`);
      }
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }
}

// 命令行入口
const program = new Command();

program
  .name('cdnuploader')
  .description('基于 GitHub 管理，上传文件到 jsdelivr CDN')
  .version('1.0.0');

// 上传命令
program
  .command('upload')
  .alias('up')
  .description('上传文件到 GitHub 仓库')
  .argument('[directory]', '指定要上传的目录路径，默认为当前目录')
  .requiredOption('-t, --token <token>', 'GitHub personal access token（必选）')
  .option('-p, --pattern <pattern>', '文件匹配模式，例如："**/*.js"')
  .option('-e, --exclude <pattern>', '要排除的文件模式，例如：*.txt,*.log,temp/**')
  .option('-r, --repo <repo>', 'GitHub 仓库 (格式: 用户名/仓库名)')
  .option('--prefix <prefix>', '文件路径前缀')
  .option('-b, --branch <branch>', '指定上传的目标分支，不指定则创建新分支')
  .option('-f, --force', '启用强制覆盖，当指定prefix时仅删除prefix目录内容，否则删除整个分支')
  .action(async (directory: string = '.', options: UploadOptions) => {
    try {
      const uploader = new CdnUploader(options);
      const result = await uploader.uploadDirectory(path.resolve(directory));

      if (result.files.length === 0) {
        console.log('没有找到匹配的文件');
        return;
      }

      console.log('即将上传以下文件');
      result.files.forEach(file => {
        console.log(`- ${file}`);
      });

      // 显示上传结果
      console.log('\n上传完成！以下是文件访问信息：');

      console.log(`上传分支: ${result.gitUrl}`);

      console.log('----------------------------------------');
      console.log(`路径前缀：${options.prefix ? options.prefix : '(无)'}`);
      console.log(`基础访问路径：${result.baseUrl}`);

      console.log('\n文件访问列表：');
      for (const [file, url] of Object.entries(result.urls)) {
        console.log(`\n文件路径：${file}`);
        console.log(`访问地址：${url}`);
      }
      console.log('\n----------------------------------------');

    } catch (error) {
      console.error('发生错误：', error);
      process.exit(1);
    }
  });

// 删除文件命令
program
  .command('delete')
  .alias('del')
  .description('删除 GitHub 仓库中的指定文件')
  .argument('<filePath>', '要删除的文件路径（相对于仓库根目录）')
  .requiredOption('-t, --token <token>', 'GitHub personal access token（必选）')
  .requiredOption('-r, --repo <repo>', 'GitHub 仓库 (格式: 用户名/仓库名)')
  .requiredOption('-b, --branch <branch>', '指定要删除文件的分支')
  .action(async (filePath: string, options: { token: string; repo: string; branch: string }) => {
    try {
      const uploader = new CdnUploader({
        token: options.token,
        repo: options.repo
      });
      
      await uploader.deleteFile(filePath, options.branch);
      console.log(`文件 ${filePath} 已成功删除`);
    } catch (error) {
      console.error('发生错误：', error);
      process.exit(1);
    }
  });

// 为了保持向后兼容，默认命令仍然是上传
program
  .argument('[directory]', '指定要上传的目录路径，默认为当前目录')
  .requiredOption('-t, --token <token>', 'GitHub personal access token（必选）')
  .option('-p, --pattern <pattern>', '文件匹配模式，例如："**/*.js"')
  .option('-e, --exclude <pattern>', '要排除的文件模式，例如：*.txt,*.log,temp/**')
  .option('-r, --repo <repo>', 'GitHub 仓库 (格式: 用户名/仓库名)')
  .option('--prefix <prefix>', '文件路径前缀')
  .option('-b, --branch <branch>', '指定上传的目标分支，不指定则创建新分支')
  .option('-f, --force', '启用强制覆盖，当指定prefix时仅删除prefix目录内容，否则删除整个分支')
  .action(async (directory: string = '.', options: UploadOptions) => {
    try {
      const uploader = new CdnUploader(options);
      const result = await uploader.uploadDirectory(path.resolve(directory));

      if (result.files.length === 0) {
        console.log('没有找到匹配的文件');
        return;
      }

      console.log('即将上传以下文件');
      result.files.forEach(file => {
        console.log(`- ${file}`);
      });

      // 显示上传结果
      console.log('\n上传完成！以下是文件访问信息：');

      console.log(`上传分支: ${result.gitUrl}`);

      console.log('----------------------------------------');
      console.log(`路径前缀：${options.prefix ? options.prefix : '(无)'}`);
      console.log(`基础访问路径：${result.baseUrl}`);

      console.log('\n文件访问列表：');
      for (const [file, url] of Object.entries(result.urls)) {
        console.log(`\n文件路径：${file}`);
        console.log(`访问地址：${url}`);
      }
      console.log('\n----------------------------------------');

    } catch (error) {
      console.error('发生错误：', error);
      process.exit(1);
    }
  });

// 仅在作为命令行工具运行时执行
if (require.main === module) {
  program.parse();
}