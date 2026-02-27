# 使用 Hostinger API / MCP 在 VPS 上部署

本文说明如何通过 **Hostinger API**（或配置好的 **Hostinger MCP**）在已有 VPS 上部署本项目的 Docker 栈。当前 VPS 信息来自 [VPS部署说明](VPS部署说明.md)：ID **1245452**，IP **72.60.104.84**（srv1245452.hstgr.cloud）。

---

## 一、Hostinger MCP 与 API 说明

- **MCP 配置**：见 [Hostinger MCP.txt](Hostinger%20MCP.txt)，其中 `API_TOKEN` 即 Hostinger API 令牌。
- **API 文档**：见 [api-1.yaml](api-1.yaml)（OpenAPI），或 [Hostinger 开发者文档](https://developers.hostinger.com)。认证方式：`Authorization: Bearer <API_TOKEN>`，请求头 `Content-Type: application/json`。
- **VPS Docker 管理**：  
  - 列出 VPS：`GET /api/vps/v1/virtual-machines`  
  - 列出某 VPS 的 Docker 项目：`GET /api/vps/v1/virtual-machines/{virtualMachineId}/docker`  
  - 创建/覆盖 Docker 项目：`POST /api/vps/v1/virtual-machines/{virtualMachineId}/docker`，body 见下。

---

## 二、通过 API 创建 Docker 项目

创建项目时，请求体格式为（见 api-1.yaml 中 `VPS.V1.VirtualMachine.DockerManager.UpRequest`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `project_name` | string | 项目名，3–64 字符，仅字母、数字、短横线、下划线，如 `dapp` |
| `content` | string | **以下三种之一**：① 指向 `docker-compose.yaml` 的 URL；② GitHub 仓库 URL（会解析为 master 分支下的 docker-compose.yaml，通常会在仓库根目录执行 compose，便于使用 `build: context: .`）；③ 原始 YAML 内容（最长 8192 字符） |
| `environment` | string（可选） | 项目环境变量，最长 8192 字符，一般为 `.env` 风格（每行 `KEY=VALUE`） |

- **若使用 GitHub 仓库**：请将本仓库推送到 GitHub，并确保默认分支（如 `main`）根目录有 `docker-compose.yml`（或合并后的生产用 compose）。API 文档中写的是解析为 `docker-compose.yaml`，若 Hostinger 只认该文件名，可在仓库根目录增加同名文件或符号链接。Hostinger 会在仓库根目录执行 compose，从而 `build: context: .` 可用。
- **若使用原始 YAML**：只能提供单文件 compose，且 **无法使用 `build: context: .`**（无源码目录），需改为使用已构建好的镜像（如推送到 Docker Hub / GHCR 后写 `image: ...`）。

当前项目为 monorepo 且使用多服务 `build`，推荐 **把代码放到 GitHub 后，用仓库 URL 作为 `content`** 部署。

---

## 三、当前 VPS 与脚本

- **VPS ID**：`1245452`（与 [VPS部署说明](VPS部署说明.md) 一致）。
- **部署脚本**：项目根目录下 [scripts/deploy-hostinger-docker.ps1](../scripts/deploy-hostinger-docker.ps1)（PowerShell）会调用 Hostinger API，在 1245452 上创建或覆盖名为 `dapp` 的 Docker 项目。需在脚本或环境中提供：
  - `API_TOKEN`：Hostinger API 令牌（与 Hostinger MCP 中的一致）；
  - `GITHUB_REPO_URL`：本项目的 GitHub 仓库 URL（例如 `https://github.com/你的用户名/d-Dapp`），用于 `content`；
  - 可选：`ENV_FILE`：本地 `.env` 路径，脚本会将其内容作为 `environment` 上传（注意不要提交含密钥的 `.env`）。

运行前请先按 [部署密钥说明](部署密钥说明.md) 准备好 `.env`，再执行脚本。

---

## 四、部署后：Nginx 与域名

通过 API 创建的 Docker 项目会在 VPS 上启动 db / api / web / admin，**不会**自动配置 Nginx 或 HTTPS。你仍需在 VPS 上：

1. 安装并配置 Nginx，使用 [nginx/dapp.sourcofsun.online.conf](../nginx/dapp.sourcofsun.online.conf) 将 dapp / admin / api.sourcofsun.online 反代到本机 3000 / 3001 / 4000。
2. 使用 certbot 申请证书：  
   `certbot --nginx -d dapp.sourcofsun.online -d admin.sourcofsun.online -d api.sourcofsun.online`  
3. 若使用 `docker-compose.prod.yml` 的端口绑定（127.0.0.1），需在 VPS 上以叠加方式启动（或把生产 compose 合并进仓库根目录的 `docker-compose.yml`），确保 Nginx 能访问到各端口。

---

## 五、小结

| 方式 | 说明 |
|------|------|
| **Hostinger MCP** | 在 Cursor 等支持 MCP 的环境中配置后，可直接调用 Hostinger 相关能力（如 VPS、Docker、防火墙等），令牌同 API。 |
| **Hostinger API** | 用同一令牌调用 REST API，脚本 [scripts/deploy-hostinger-docker.ps1](../scripts/deploy-hostinger-docker.ps1) 用于在 VPS 1245452 上创建/更新 Docker 项目 `dapp`。 |
| **部署条件** | 代码需在 GitHub，且默认分支根目录有可用的 `docker-compose.yml`（或合并后的生产 compose）；或提供仅使用 `image:` 的 compose 与对应镜像。 |

密钥与配置项见 [部署密钥说明](部署密钥说明.md)。
