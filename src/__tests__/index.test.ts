import { CdnUploader, UploadOptions } from '../index';
import { Octokit } from '@octokit/rest';

// Mock Octokit
jest.mock('@octokit/rest');

describe('CdnUploader', () => {
  let uploader: CdnUploader;
  const mockOptions: UploadOptions = {
    token: 'test-token',
    repo: 'test-owner/test-repo',
    branch: 'test-branch'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    uploader = new CdnUploader(mockOptions);
  });

  describe('构造函数', () => {
    it('应该使用提供的选项创建实例', () => {
      const options: UploadOptions = {
        token: 'test-token',
        repo: 'custom/repo'
      };
      const instance = new CdnUploader(options);
      expect(instance).toBeInstanceOf(CdnUploader);
    });

    it('应该使用默认仓库如果未提供', () => {
      const options: UploadOptions = {
        token: 'test-token'
      };
      const instance = new CdnUploader(options);
      expect(instance).toBeInstanceOf(CdnUploader);
    });
  });

  describe('deleteFile', () => {
    it('应该在没有token时抛出错误', async () => {
      const uploaderWithoutToken = new CdnUploader({
        repo: 'test/repo'
      });
      
      await expect(
        uploaderWithoutToken.deleteFile('test.txt', 'branch')
      ).rejects.toThrow('需要提供 GitHub token 才能删除文件');
    });

    it('应该在没有repo时抛出错误', async () => {
      // 创建一个没有repo的实例，但需要手动设置options.repo为undefined
      const uploaderWithoutRepo = new CdnUploader({
        token: 'test-token',
        repo: undefined as any
      });
      
      // 直接访问私有属性来测试，或者通过反射设置
      (uploaderWithoutRepo as any).options.repo = undefined;
      
      await expect(
        uploaderWithoutRepo.deleteFile('test.txt', 'branch')
      ).rejects.toThrow('需要提供 GitHub 仓库名称');
    });

    it('应该在没有分支时抛出错误', async () => {
      const uploaderWithoutBranch = new CdnUploader({
        token: 'test-token',
        repo: 'test/repo'
      });
      
      await expect(
        uploaderWithoutBranch.deleteFile('test.txt')
      ).rejects.toThrow('需要指定分支名称才能删除文件');
    });

    it('应该在repo格式错误时抛出错误', async () => {
      const uploaderWithBadRepo = new CdnUploader({
        token: 'test-token',
        repo: 'invalid-repo-format'
      });
      
      await expect(
        uploaderWithBadRepo.deleteFile('test.txt', 'branch')
      ).rejects.toThrow('GitHub 仓库格式错误');
    });
  });

  describe('uploadDirectory', () => {
    it('应该在目录不存在时抛出错误', async () => {
      await expect(
        uploader.uploadDirectory('/nonexistent/directory')
      ).rejects.toThrow('指定的目录不存在');
    });

    it('应该在没有token时抛出错误', async () => {
      const uploaderWithoutToken = new CdnUploader({
        repo: 'test/repo'
      });
      
      // 创建一个临时目录用于测试
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, 'temp-test-dir');
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'test content');
      
      try {
        await expect(
          uploaderWithoutToken.uploadDirectory(tempDir)
        ).rejects.toThrow('需要提供 GitHub token 才能上传文件');
      } finally {
        // 清理
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
