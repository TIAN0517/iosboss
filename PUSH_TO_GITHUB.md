# 推送到 GitHub 指南

## 🎯 目標

將本地項目推送到 GitHub 倉庫：`https://github.com/TIAN0517/bossai.git`

---

## 📋 前置條件

- ✅ GitHub 倉庫已創建
- ✅ Git 已安裝
- ✅ README.md 已創建
- ✅ .gitignore 已配置
- ✅ LICENSE 已創建

---

## 🚀 推送步驟

### 第 1 步：初始化 Git（如果還未初始化）

```bash
# 檢查是否已初始化
git status

# 如果顯示 "not a git repository"，則需要初始化
git init
```

### 第 2 步：設置主要分支

```bash
# 設置 main 分支（GitHub 標準）
git branch -M main
```

### 第 3 步：添加遠端倉庫

```bash
# 添加遠端倉庫
git remote add origin https://github.com/TIAN0517/bossai.git

# 驗證遠端
git remote -v
```

### 第 4 步：添加所有文件

```bash
# 添加所有文件（.gitignore 會排除敏感文件）
git add .

# 檢查要提交的文件
git status
```

### 第 5 步：創建首次提交

```bash
# 創建首次提交
git commit -m "Initial commit: BossJy-99 Gas Management System

- Complete gas management system with Next.js 15
- Customer, order, inventory management
- Fleet tracking and dispatch
- LINE Bot integration
- AI chat functionality
- Voice recognition and synthesis
- Docker deployment support
- Migration tools for Vercel + Supabase

Made with ❤️ by BossJy-99 Team"
```

### 第 6 步：推送到 GitHub

```bash
# 推送到 GitHub（使用 main 分支）
git push -u origin main

# 如果遇到認證問題，使用 HTTPS：
git push -u https://YOUR-USERNAME@github.com/TIAN0517/bossai.git main
```

---

## 🔐 配置 GitHub 認證

### 選項 1：使用 SSH（推薦）

1. 生成 SSH 密鑰（如果還沒有）
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. 將 SSH 公鑰添加到 GitHub
   ```
   Settings → SSH and GPG keys → New SSH key
   複製 ~/.ssh/id_ed25519.pub 的內容
   ```

3. 使用 SSH URL
   ```bash
   git remote set-url origin git@github.com:TIAN0517/bossai.git
   git push -u origin main
   ```

### 選項 2：使用 Personal Access Token

1. 在 GitHub 創建 Personal Access Token
   ```
   Settings → Developer settings → Personal access tokens → Generate new token
   選擇權限：repo（完整倉庫訪問）
   ```

2. 使用 Token 推送
   ```bash
   git push -u https://YOUR-TOKEN@github.com/TIAN0517/bossai.git main
   ```

### 選項 3：使用 GitHub CLI（最簡單）

1. 安裝 GitHub CLI
   ```bash
   # Windows
   winget install --id GitHub.cli

   # Mac
   brew install gh

   # Linux
   sudo apt install gh
   ```

2. 登入
   ```bash
   gh auth login
   ```

3. 推送
   ```bash
   git push -u origin main
   ```

---

## 🔧 常見問題

### Q1：遇到 "error: src refspec master does not match any"

**A：** 您的倉庫可能使用 `master` 而不是 `main` 分支

```bash
# 解決方案 1：切換到 master 分支
git branch -M master
git push -u origin master

# 解決方案 2：使用遠端分支
git push -u origin main:main
```

### Q2：遇到 "Permission denied (publickey)"

**A：** SSH 密鑰配置有問題

```bash
# 1. 檢查 SSH 密鑰
ls -la ~/.ssh/

# 2. 測試 SSH 連接
ssh -T git@github.com

# 3. 如果失敗，添加到 ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Q3：遇到 "fatal: remote origin already exists"

**A：** 遠端已存在，需要更新

```bash
# 解決方案 1：更新 URL
git remote set-url origin https://github.com/TIAN0517/bossai.git

# 解決方案 2：刪除後重新添加
git remote remove origin
git remote add origin https://github.com/TIAN0517/bossai.git
```

### Q4：推送後沒有看到所有文件

**A：** 檢查 .gitignore 是否正確配置

```bash
# 查看哪些文件被忽略
git check-ignore -v

# 查看狀態
git status
```

### Q5：文件太大，推送失敗

**A：** GitHub 有 100MB 單文件限制

```bash
# 使用 Git LFS 追蹤大文件
git lfs track "*.psd"
git add .gitattributes
git commit -m "Track large files with Git LFS"
```

---

## ✅ 推送後驗證

### 1. 檢查 GitHub 倉庫

訪問：https://github.com/TIAN0517/bossai

確認：
- ✅ 所有文件都已上傳
- ✅ README.md 正確顯示
- ✅ LICENSE 正確顯示
- ✅ .gitignore 正確運作（敏感文件未上傳）

### 2. 檢查分支

```bash
# 查看遠端分支
git branch -r

# 應該看到：origin/main
```

### 3. 檢查提交記錄

```bash
# 查看提交歷史
git log --oneline

# 應該看到剛剛的首次提交
```

---

## 📝 後續工作流程

推送後，您的工作流程是：

```bash
# 1. 開發新功能
git checkout -b feature/new-feature

# 2. 編寫代碼
# ... 您的更改 ...

# 3. 提交更改
git add .
git commit -m "Add new feature"

# 4. 推送到 GitHub
git push -u origin feature/new-feature

# 5. 在 GitHub 創建 Pull Request
# 合併到 main 分支後，在本地同步
git checkout main
git pull origin main
```

---

## 🚀 現在開始推送吧！

執行以下命令序列：

```bash
# 1. 初始化 Git（如果需要）
git init

# 2. 設置 main 分支
git branch -M main

# 3. 添加遠端
git remote add origin https://github.com/TIAN0517/bossai.git

# 4. 添加所有文件
git add .

# 5. 提交
git commit -m "Initial commit: BossJy-99 Gas Management System

- Complete gas management system
- Next.js 15 + PostgreSQL
- LINE Bot + AI integration
- Docker + Vercel deployment

Made with ❤️ by BossJy-99 Team"

# 6. 推送到 GitHub
git push -u origin main
```

**完成後，您的代碼就會在 GitHub 上，可以開始部署到 Vercel 了！** 🎉

---

## 📞 需要幫助？

如果推送過程中遇到問題：

1. **查看 Git 文檔**
   https://git-scm.com/doc

2. **查看 GitHub 文檔**
   https://docs.github.com

3. **檢查網絡連接**
   ```bash
   ping github.com
   ```

---

Made with ❤️ by BossJy-99 Team
