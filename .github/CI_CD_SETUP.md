# GitHub Actions CI/CD 配置说明

## 📋 当前分支模型

本 fork 使用以下分支职责：

- `upstream/main`：上游事实来源，仅用于同步
- `main`：本 fork 的上游同步镜像分支，不承接日常开发
- `release`：默认开发/发布分支，所有功能分支从这里切出并回合

## 🔄 工作流概览

### 1. PR 构建检查（`pr-check.yml`）

- **触发条件**：向 `release` 或 `main` 提交 Pull Request
- **作用**：验证代码可构建、类型检查、格式检查、迁移校验
- **说明**：`release` 是日常开发 PR 的主要目标；`main` 仅用于上游同步 PR 校验

### 2. 测试套件（`test.yml`）

- **触发条件**：`release` / `main` 的 push 与 PR
- **作用**：运行 lint、typecheck、单元测试、集成测试、API 测试

### 3. 分支构建（`dev.yml`）

- **触发条件**：除 `main` 之外的分支 push
- **作用**：为 `release` 和功能分支构建预览镜像
- **镜像标签**：
  - `release` 分支：`release`、`release-<sha>`
  - 其他分支：`<branch-slug>`、`<branch-slug>-<sha>`

### 4. fork 发布（`release.yml`）

- **触发条件**：`release` 分支 push 或手动触发
- **作用**：根据 `VERSION` 中记录的上游基础版本生成 fork 发布标签、创建 GitHub Release、推送 GHCR 镜像
- **fork 标签格式**：`vX.Y.Z-fork.N`
- **上游同步标签（手动约定）**：`upstream-vX.Y.Z`

## 🔐 建议的 GitHub Secrets

至少确认以下配置在 fork 仓库可用：

```text
GITHUB_TOKEN        # GitHub Actions 默认提供
GH_PAT              # 可选，若部分 workflow 需要更高权限
ANTHROPIC_API_KEY   # 若启用 Claude workflow
ANTHROPIC_BASE_URL  # 可选，自建代理时使用
```

## 🛡️ 分支保护建议

### 为 `release` 分支设置保护规则

建议启用：
- Require a pull request before merging
- Require status checks to pass before merging
  - `Code Quality Check`
  - `Docker Build Test`
  - `📊 Test Summary`
- Require branches to be up to date before merging
- Require approvals（按团队需要）
- Require conversation resolution before merging

### 为 `main` 分支设置保护规则

建议比 `release` 更严格：
- Require a pull request before merging
- 限制只有维护者可更新
- 仅允许上游同步相关 PR 或人工同步提交
- 禁止作为日常功能开发目标分支

## 🔄 推荐流程

### 1. 上游同步流程

```bash
# 1. 获取上游最新代码
git checkout main
git fetch upstream
git merge --ff-only upstream/main

# 2. 可选：记录同步标签
git tag upstream-v0.6.6

# 3. 推送到自己的 fork main
git push origin main --follow-tags
```

### 2. 功能开发流程

```bash
# 1. 从 release 切功能分支
git checkout release
git pull origin release
git checkout -b feature/new-feature

# 2. 开发并提交
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 3. 创建 PR 到 release
# GitHub 会自动运行 PR 检查与测试
```

### 3. fork 发版流程

```bash
# 1. 确认 release 已包含要发布的改动
# 2. 若同步了新的上游版本，更新 VERSION（例如 0.6.6）
# 3. push 到 release 或手动触发 release.yml

# GitHub Actions 会自动：
# - 生成 fork 标签（如 v0.6.6-fork.1）
# - 创建 GitHub Release
# - 推送 GHCR 镜像（latest、v0.6.6-fork.1、0.6.6-fork.1）
```

## 🐳 Docker 镜像使用

```bash
# 最新 fork 稳定版
docker pull ghcr.io/bytetrue/claude-code-hub:latest

# 特定 fork 版本
docker pull ghcr.io/bytetrue/claude-code-hub:v0.6.6-fork.1
```

## ⚠️ 注意事项

1. **默认开发/发布分支是 `release`**，不是 `main`
2. **`main` 只做 upstream 同步**，不要把功能 PR 合到 `main`
3. **fork 发版标签必须使用 `vX.Y.Z-fork.N`**，避免与上游 `vX.Y.Z` 混淆
4. **上游同步标签建议使用 `upstream-vX.Y.Z`**，仅作为同步记录
5. **工作流中的自动化写操作仍需结合 GitHub 分支保护规则使用**
