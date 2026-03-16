# Lightpanda Browser 集成 AutoIntel-Squad 实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Lightpanda 无头浏览器集成到 AutoIntel-Squad 多智能体系统，为 JS 渲染密集型网站提供真实 DOM 抓取能力，提升情报采集质量和成功率。

**Architecture:** 新增 `tools/` 目录，包含 Lightpanda 安装脚本、Node.js CDP 抓取工具和 URL 路由配置。修改 `agents_system/common/` 共享模块引入"智能抓取策略"，让各 Agent 根据目标 URL 自动选择 WebFetch（简单页面）或 Lightpanda（JS 渲染页面）。保持现有降级机制不变，Lightpanda 作为 WebFetch 之上的增强层。

**Tech Stack:** Lightpanda (Zig binary), Node.js + Puppeteer-core (CDP client), Bash (安装/管理脚本)

---

## 文件结构总览

```
AutoIntel-Squad/
├── tools/                                    # 新增目录
│   ├── install_lightpanda.sh                 # Lightpanda 安装脚本
│   ├── lightpanda_server.sh                  # LP 服务启停管理脚本
│   ├── lp_fetch.mjs                          # Node.js CDP 抓取工具（核心）
│   ├── lp_batch_fetch.mjs                    # 批量抓取工具（Code_Scout 用）
│   ├── url_routing.json                      # URL 路由配置（哪些 URL 需要 JS 渲染）
│   └── package.json                          # Node.js 依赖声明
├── agents_system/
│   └── common/
│       ├── common_workflow.md                # 修改：阶段2新增"智能抓取策略"
│       └── common_rules.md                   # 修改：新增 Rule-17 Lightpanda 使用规则
├── agents_system/
│   ├── industry_watcher.md                   # 修改：Skill-1 数据源策略引入 LP
│   ├── code_scout.md                         # 修改：访问策略层级2改用 LP
│   └── paper_hunter.md                       # 微调：会议官网可选 LP
└── AGENTS.md                                 # 修改：新增 tools/ 目录说明
```

**不修改的文件（无需 JS 渲染）：**
- `autointel_dispatcher.md` — 调度逻辑不涉及网页抓取
- `chief_analyst.md` — 只读取本地 JSON 文件，不访问网页
- `common_output.md` — 输出格式不变
- `common_profile.md` — Profile 模板不变

---

## Chunk 1: 基础设施 — Lightpanda 安装与服务管理

### Task 1: 创建 Lightpanda 安装脚本

**Files:**
- Create: `tools/install_lightpanda.sh`

- [ ] **Step 1: 编写安装脚本**

```bash
#!/usr/bin/env bash
# install_lightpanda.sh — 下载并安装 Lightpanda nightly binary
set -euo pipefail

INSTALL_DIR="${LIGHTPANDA_HOME:-$HOME/.local/bin}"
PLATFORM="$(uname -s)-$(uname -m)"

echo "[AutoIntel] 安装 Lightpanda 浏览器..."

case "$PLATFORM" in
  Linux-x86_64)
    URL="https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux"
    ;;
  Darwin-arm64)
    URL="https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-aarch64-macos"
    ;;
  *)
    echo "[错误] 不支持的平台: $PLATFORM (仅支持 Linux x86_64 和 macOS arm64)"
    exit 1
    ;;
esac

mkdir -p "$INSTALL_DIR"
echo "[AutoIntel] 下载 Lightpanda 到 $INSTALL_DIR/lightpanda ..."
curl -L -o "$INSTALL_DIR/lightpanda" "$URL"
chmod a+x "$INSTALL_DIR/lightpanda"

# 验证安装
if "$INSTALL_DIR/lightpanda" --help >/dev/null 2>&1; then
  echo "[AutoIntel] Lightpanda 安装成功: $INSTALL_DIR/lightpanda"
else
  echo "[警告] Lightpanda 下载完成但验证失败，请手动检查"
fi
```

- [ ] **Step 2: 设置执行权限并测试**

Run: `chmod +x tools/install_lightpanda.sh && bash tools/install_lightpanda.sh`
Expected: Lightpanda binary downloaded to `~/.local/bin/lightpanda`

- [ ] **Step 3: 验证 Lightpanda 基本功能**

Run: `~/.local/bin/lightpanda fetch https://example.com 2>&1 | head -5`
Expected: HTML output containing `<title>Example Domain</title>`

- [ ] **Step 4: Commit**

```bash
git add tools/install_lightpanda.sh
git commit -m "feat(tools): add Lightpanda browser install script"
```

---

### Task 2: 创建 Lightpanda 服务管理脚本

**Files:**
- Create: `tools/lightpanda_server.sh`

- [ ] **Step 1: 编写服务管理脚本**

```bash
#!/usr/bin/env bash
# lightpanda_server.sh — 管理 Lightpanda CDP 服务器的启停
set -euo pipefail

LIGHTPANDA="${LIGHTPANDA_BIN:-$HOME/.local/bin/lightpanda}"
HOST="${LP_HOST:-127.0.0.1}"
PORT="${LP_PORT:-9222}"
PID_FILE="/tmp/lightpanda.pid"
LOG_FILE="/tmp/lightpanda.log"

start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[AutoIntel] Lightpanda 已在运行 (PID: $(cat "$PID_FILE"))"
    return 0
  fi
  if ! command -v "$LIGHTPANDA" &>/dev/null && [ ! -x "$LIGHTPANDA" ]; then
    echo "[错误] Lightpanda 未安装，请先运行: bash tools/install_lightpanda.sh"
    exit 1
  fi
  echo "[AutoIntel] 启动 Lightpanda CDP 服务器 ($HOST:$PORT)..."
  LIGHTPANDA_DISABLE_TELEMETRY=true nohup "$LIGHTPANDA" serve \
    --host "$HOST" --port "$PORT" \
    --log_level warn \
    > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[AutoIntel] Lightpanda 启动成功 (PID: $(cat "$PID_FILE"), ws://$HOST:$PORT)"
  else
    echo "[错误] Lightpanda 启动失败，日志: $LOG_FILE"
    cat "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
}

stop() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "[AutoIntel] 停止 Lightpanda (PID: $PID)..."
      kill "$PID" && rm -f "$PID_FILE"
      echo "[AutoIntel] Lightpanda 已停止"
    else
      rm -f "$PID_FILE"
      echo "[AutoIntel] 进程已不存在，已清理 PID 文件"
    fi
  else
    echo "[AutoIntel] Lightpanda 未在运行"
  fi
}

status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "running|PID=$(cat "$PID_FILE")|ws://$HOST:$PORT"
    return 0
  else
    echo "stopped"
    return 1
  fi
}

case "${1:-help}" in
  start)   start ;;
  stop)    stop ;;
  status)  status ;;
  restart) stop; sleep 1; start ;;
  *)       echo "用法: $0 {start|stop|status|restart}" ; exit 1 ;;
esac
```

- [ ] **Step 2: 测试启停流程**

Run: `chmod +x tools/lightpanda_server.sh && bash tools/lightpanda_server.sh start && sleep 2 && bash tools/lightpanda_server.sh status && bash tools/lightpanda_server.sh stop`
Expected: 输出 "启动成功" → "running|PID=..." → "已停止"

- [ ] **Step 3: Commit**

```bash
git add tools/lightpanda_server.sh
git commit -m "feat(tools): add Lightpanda CDP server management script"
```

---

## Chunk 2: 核心抓取工具 — Node.js CDP 客户端

### Task 3: 创建 Node.js 项目与依赖

**Files:**
- Create: `tools/package.json`

- [ ] **Step 1: 编写 package.json**

```json
{
  "name": "autointel-lightpanda-tools",
  "version": "1.0.0",
  "description": "AutoIntel-Squad Lightpanda CDP 抓取工具集",
  "type": "module",
  "scripts": {
    "fetch": "node lp_fetch.mjs",
    "batch": "node lp_batch_fetch.mjs"
  },
  "dependencies": {
    "puppeteer-core": "^24.0.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `cd tools && npm install`
Expected: `node_modules/` created with puppeteer-core installed

- [ ] **Step 3: 添加 .gitignore 条目**

确保 `tools/node_modules/` 在项目 `.gitignore` 中：

Run: `echo "tools/node_modules/" >> .gitignore`

- [ ] **Step 4: Commit**

```bash
git add tools/package.json .gitignore
git commit -m "feat(tools): add Node.js project for Lightpanda CDP client"
```

---

### Task 4: 创建核心单页抓取工具 lp_fetch.mjs

**Files:**
- Create: `tools/lp_fetch.mjs`

这是整个集成的核心文件。Agent 通过 Bash 调用此脚本抓取 JS 渲染页面，输出结构化 JSON。

- [ ] **Step 1: 编写 lp_fetch.mjs**

```javascript
#!/usr/bin/env node
/**
 * lp_fetch.mjs — AutoIntel-Squad Lightpanda 单页抓取工具
 *
 * 用法:
 *   node tools/lp_fetch.mjs <url> [options]
 *
 * 选项:
 *   --timeout <ms>      页面加载超时，默认 30000
 *   --wait <selector>   等待指定 CSS 选择器出现
 *   --wait-network      等待网络空闲 (networkidle0)
 *   --extract-links     提取页面所有链接
 *   --extract-text      提取纯文本内容
 *   --cdp <url>         CDP 服务器地址，默认 ws://127.0.0.1:9222
 *
 * 输出: JSON 到 stdout
 *   { "url", "title", "content", "links", "timestamp", "status" }
 */
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http'));

if (!url) {
  console.error(JSON.stringify({
    status: 'error',
    error: '用法: node lp_fetch.mjs <url> [--timeout ms] [--wait selector] [--wait-network] [--extract-links] [--extract-text] [--cdp ws://host:port]'
  }));
  process.exit(1);
}

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
const hasFlag = (flag) => args.includes(flag);

const CDP_URL = getArg('--cdp', 'ws://127.0.0.1:9222');
const TIMEOUT = parseInt(getArg('--timeout', '30000'), 10);
const WAIT_SELECTOR = getArg('--wait', null);
const WAIT_NETWORK = hasFlag('--wait-network');
const EXTRACT_LINKS = hasFlag('--extract-links');
const EXTRACT_TEXT = hasFlag('--extract-text');

async function fetchPage() {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: CDP_URL,
      defaultViewport: null,
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT);

    const waitUntil = WAIT_NETWORK ? 'networkidle0' : 'domcontentloaded';
    const response = await page.goto(url, { waitUntil, timeout: TIMEOUT });

    if (WAIT_SELECTOR) {
      await page.waitForSelector(WAIT_SELECTOR, { timeout: TIMEOUT });
    }

    const title = await page.title();

    let content = '';
    if (EXTRACT_TEXT) {
      content = await page.evaluate(() => {
        const el = document.querySelector('article') ||
                   document.querySelector('main') ||
                   document.querySelector('.content') ||
                   document.body;
        return el ? el.innerText.trim().slice(0, 10000) : '';
      });
    } else {
      content = await page.content();
    }

    let links = [];
    if (EXTRACT_LINKS) {
      links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim().slice(0, 100), href: a.href }))
          .filter(l => l.href.startsWith('http'))
          .slice(0, 200)
      );
    }

    const result = {
      status: 'success',
      url: url,
      title: title,
      content: content,
      links: links,
      http_status: response ? response.status() : null,
      timestamp: new Date().toISOString(),
    };

    await page.close();
    await context.close();
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify({
      status: 'error',
      url: url,
      error: err.message,
      timestamp: new Date().toISOString(),
    }));
    process.exit(1);
  } finally {
    if (browser) await browser.disconnect();
  }
}

fetchPage();
```

- [ ] **Step 2: 启动 Lightpanda 并测试抓取**

Run:
```bash
bash tools/lightpanda_server.sh start
sleep 2
node tools/lp_fetch.mjs https://example.com --extract-text --extract-links
bash tools/lightpanda_server.sh stop
```
Expected: JSON output with `"status": "success"`, title "Example Domain", text content, and links array

- [ ] **Step 3: 测试 JS 渲染页面**

Run:
```bash
bash tools/lightpanda_server.sh start
sleep 2
node tools/lp_fetch.mjs https://demo-browser.lightpanda.io/campfire-commerce/ --wait-network --extract-text
bash tools/lightpanda_server.sh stop
```
Expected: JSON with rendered page content (not empty template HTML)

- [ ] **Step 4: 测试错误处理（LP 未启动时）**

Run: `node tools/lp_fetch.mjs https://example.com 2>&1`
Expected: JSON with `"status": "error"` and connection error message

- [ ] **Step 5: Commit**

```bash
git add tools/lp_fetch.mjs
git commit -m "feat(tools): add core Lightpanda CDP fetch tool (lp_fetch.mjs)"
```

---

### Task 5: 创建批量抓取工具 lp_batch_fetch.mjs

**Files:**
- Create: `tools/lp_batch_fetch.mjs`

Code_Scout 需要批量抓取多个 GitHub 项目页面，此工具支持并发控制。

- [ ] **Step 1: 编写 lp_batch_fetch.mjs**

```javascript
#!/usr/bin/env node
/**
 * lp_batch_fetch.mjs — AutoIntel-Squad 批量抓取工具
 *
 * 用法:
 *   echo '["url1","url2"]' | node tools/lp_batch_fetch.mjs [options]
 *   node tools/lp_batch_fetch.mjs --urls-file urls.json [options]
 *
 * 选项:
 *   --concurrency <n>   并发数，默认 3
 *   --timeout <ms>      单页超时，默认 30000
 *   --extract-text      提取纯文本
 *   --extract-links     提取链接
 *   --cdp <url>         CDP 地址，默认 ws://127.0.0.1:9222
 *   --urls-file <path>  从 JSON 文件读取 URL 列表
 *
 * 输出: JSON 数组到 stdout
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
const hasFlag = (flag) => args.includes(flag);

const CDP_URL = getArg('--cdp', 'ws://127.0.0.1:9222');
const CONCURRENCY = parseInt(getArg('--concurrency', '3'), 10);
const TIMEOUT = parseInt(getArg('--timeout', '30000'), 10);
const EXTRACT_TEXT = hasFlag('--extract-text');
const EXTRACT_LINKS = hasFlag('--extract-links');
const URLS_FILE = getArg('--urls-file', null);

async function getUrls() {
  if (URLS_FILE) {
    return JSON.parse(readFileSync(URLS_FILE, 'utf-8'));
  }
  // 从 stdin 读取
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function fetchOne(browser, url) {
  let context;
  try {
    context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT);
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    const title = await page.title();

    let content = '';
    if (EXTRACT_TEXT) {
      content = await page.evaluate(() => {
        const el = document.querySelector('article') || document.querySelector('main') || document.body;
        return el ? el.innerText.trim().slice(0, 5000) : '';
      });
    }

    let links = [];
    if (EXTRACT_LINKS) {
      links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim().slice(0, 80), href: a.href }))
          .filter(l => l.href.startsWith('http'))
          .slice(0, 100)
      );
    }

    await page.close();
    await context.close();
    return { status: 'success', url, title, content, links, http_status: resp?.status() };
  } catch (err) {
    if (context) try { await context.close(); } catch {}
    return { status: 'error', url, error: err.message };
  }
}

async function runBatch(urls) {
  const browser = await puppeteer.connect({ browserWSEndpoint: CDP_URL });
  const results = [];
  // 简单并发池
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(u => fetchOne(browser, u)));
    results.push(...batchResults);
  }
  await browser.disconnect();
  return results;
}

try {
  const urls = await getUrls();
  if (!Array.isArray(urls) || urls.length === 0) {
    console.log(JSON.stringify([]));
    process.exit(0);
  }
  const results = await runBatch(urls);
  console.log(JSON.stringify(results, null, 2));
} catch (err) {
  console.log(JSON.stringify({ status: 'error', error: err.message }));
  process.exit(1);
}
```

- [ ] **Step 2: 测试批量抓取**

Run:
```bash
bash tools/lightpanda_server.sh start
sleep 2
echo '["https://example.com", "https://demo-browser.lightpanda.io/amiibo/"]' | node tools/lp_batch_fetch.mjs --extract-text --concurrency 2
bash tools/lightpanda_server.sh stop
```
Expected: JSON array with 2 results, both `"status": "success"`

- [ ] **Step 3: Commit**

```bash
git add tools/lp_batch_fetch.mjs
git commit -m "feat(tools): add batch fetch tool for parallel page scraping"
```

---

## Chunk 3: URL 路由配置 — 智能选择抓取策略

### Task 6: 创建 URL 路由配置文件

**Files:**
- Create: `tools/url_routing.json`

此文件定义哪些 URL 模式需要 Lightpanda JS 渲染，哪些用 WebFetch 即可。Agent 在抓取前查阅此配置决定策略。

- [ ] **Step 1: 编写 url_routing.json**

```json
{
  "_comment": "AutoIntel-Squad URL 路由配置 — 决定使用 WebFetch 还是 Lightpanda",
  "_updated": "2026-03-16",
  "lightpanda_required": {
    "_comment": "这些 URL 模式必须使用 Lightpanda（JS 渲染密集型）",
    "patterns": [
      {
        "domain": "github.com/trending",
        "reason": "GitHub Trending 页面依赖 JS 动态加载",
        "agent": "Code_Scout"
      },
      {
        "domain": "github.com/search",
        "reason": "GitHub 搜索结果页 JS 渲染",
        "agent": "Code_Scout"
      },
      {
        "domain": "huggingface.co",
        "reason": "Hugging Face 页面重度 JS 框架",
        "agent": "Code_Scout"
      },
      {
        "domain": "blog.csdn.net",
        "reason": "CSDN 博客内容 JS 延迟加载",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "qbitai.com",
        "reason": "量子位 SPA 架构",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "jiqizhixin.com",
        "reason": "机器之心 JS 渲染",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "leiphone.com",
        "reason": "雷峰网动态加载",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "huxiu.com",
        "reason": "虎嗅网 SPA",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "opendrivelab.com",
        "reason": "OpenDriveLab 项目页 JS 渲染",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "tesla.com/blog",
        "reason": "Tesla 博客 React SPA",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "waymo.com/blog",
        "reason": "Waymo 博客 JS 框架",
        "agent": "Industry_Watcher"
      },
      {
        "domain": "cvpr*.thecvf.com",
        "reason": "CVPR 会议页面 JS 渲染论文列表",
        "agent": "Paper_Hunter"
      }
    ]
  },
  "webfetch_preferred": {
    "_comment": "这些 URL 模式用 WebFetch 即可（静态或 API 返回 JSON）",
    "patterns": [
      {
        "domain": "arxiv.org",
        "reason": "arXiv 页面基本为静态 HTML"
      },
      {
        "domain": "api.github.com",
        "reason": "GitHub REST API 返回 JSON，无需浏览器"
      },
      {
        "domain": "electrek.co",
        "reason": "Electrek 静态文章页"
      },
      {
        "domain": "teslarati.com",
        "reason": "Teslarati WordPress 静态页"
      },
      {
        "domain": "insideevs.com",
        "reason": "InsideEVs 静态文章页"
      },
      {
        "domain": "theverge.com",
        "reason": "The Verge 文章页基本可用"
      }
    ]
  },
  "fallback_strategy": {
    "_comment": "当 Lightpanda 不可用时的降级策略",
    "order": [
      "lightpanda",
      "webfetch",
      "skip_with_note"
    ],
    "lightpanda_health_check": "bash tools/lightpanda_server.sh status",
    "auto_start": true,
    "auto_start_command": "bash tools/lightpanda_server.sh start"
  }
}
```

- [ ] **Step 2: 验证 JSON 合法性**

Run: `cat tools/url_routing.json | python3 -m json.tool > /dev/null && echo "JSON valid"`
Expected: "JSON valid"

- [ ] **Step 3: Commit**

```bash
git add tools/url_routing.json
git commit -m "feat(tools): add URL routing config for fetch strategy selection"
```

---

## Chunk 4: Agent 提示词修改 — 集成智能抓取策略

### Task 7: 修改 common_rules.md — 新增 Lightpanda 规则

**Files:**
- Modify: `agents_system/common/common_rules.md:79-98` (在"执行模式规则"之后追加)

- [ ] **Step 1: 在 common_rules.md 末尾的"执行模式规则"后追加 Rule-17**

在 `Rule-16` 之后、`## 引用方式` 之前插入：

```markdown
### Rule-17: 智能抓取策略（Lightpanda 集成）
- **原则**：根据目标 URL 特征自动选择最优抓取方式
- **策略选择**：
  - **WebFetch 优先**：静态页面、API 端点（arxiv.org, api.github.com, electrek.co 等）
  - **Lightpanda 优先**：JS 渲染密集型页面（GitHub Trending/Search, CSDN, 量子位, 机器之心, 虎嗅, Tesla/Waymo 博客等）
  - **参考配置**：`tools/url_routing.json` 中定义的 URL 模式映射
- **降级机制**：
  - Lightpanda 不可用时 → 自动降级到 WebFetch
  - WebFetch 也失败时 → 记录 `access_status: "restricted"` 并跳过
- **使用方式**：
  - 单页抓取：`node tools/lp_fetch.mjs <url> --extract-text --wait-network`
  - 批量抓取：`echo '["url1","url2"]' | node tools/lp_batch_fetch.mjs --extract-text`
  - 服务管理：`bash tools/lightpanda_server.sh start|stop|status`
- **前置条件**：使用 Lightpanda 前需确认服务已启动（`bash tools/lightpanda_server.sh status`）
- **数据真实性**：Lightpanda 抓取的数据同样适用 Rule-1 至 Rule-6 的所有真实性约束
```

- [ ] **Step 2: 验证修改后文件结构完整**

Run: 手动检查 `common_rules.md` 确保 Rule-1 到 Rule-17 编号连续，引用方式和版本部分完整

- [ ] **Step 3: Commit**

```bash
git add agents_system/common/common_rules.md
git commit -m "feat(rules): add Rule-17 for Lightpanda smart fetch strategy"
```

---

### Task 8: 修改 common_workflow.md — 阶段2增加智能抓取

**Files:**
- Modify: `agents_system/common/common_workflow.md:17-29` (阶段2: 搜索执行与数据获取)

- [ ] **Step 1: 在阶段2的"搜索执行"步骤中插入智能抓取决策**

在 `### 阶段2: 搜索执行与数据获取` 的第2项"搜索执行"之后，插入新的第2.5项：

```markdown
   2.5 **智能抓取策略选择**（Lightpanda 集成）：
      - 检查目标 URL 是否匹配 `tools/url_routing.json` 中的 `lightpanda_required` 模式
      - 若匹配：
        a. 检查 Lightpanda 服务状态：`bash tools/lightpanda_server.sh status`
        b. 若未运行且 `auto_start` 为 true：自动启动 `bash tools/lightpanda_server.sh start`
        c. 使用 `node tools/lp_fetch.mjs <url> --extract-text --wait-network` 抓取
        d. 解析返回的 JSON，提取 `content` 和 `links` 字段
      - 若不匹配或 Lightpanda 不可用：使用 WebFetch 工具（原有流程）
      - 记录实际使用的抓取方式到 `metadata.fetch_method: "lightpanda"|"webfetch"`
```

- [ ] **Step 2: 在"性能优化建议"部分追加 Lightpanda 相关建议**

在 `### 搜索优化` 之后追加：

```markdown
### Lightpanda 优化
- 服务复用：一次任务执行期间保持 Lightpanda 服务运行，避免反复启停
- 批量抓取：多个 URL 使用 lp_batch_fetch.mjs 并发获取，减少总耗时
- 超时控制：JS 渲染页面默认 30 秒超时，复杂页面可调整 --timeout 参数
- 内容提取：优先使用 --extract-text 获取纯文本，减少后续处理开销
```

- [ ] **Step 3: Commit**

```bash
git add agents_system/common/common_workflow.md
git commit -m "feat(workflow): integrate Lightpanda smart fetch into Phase 2"
```

---

### Task 9: 修改 industry_watcher.md — 数据源策略引入 LP

**Files:**
- Modify: `agents_system/industry_watcher.md:12-27` (Skill-1: 三级数据源搜索策略)

- [ ] **Step 1: 在 Skill-1 的第一优先级和第二优先级中标注 LP 使用场景**

在 `### Skill-1: 三级数据源搜索策略` 中，修改为：

```markdown
### Skill-1: 三级数据源搜索策略（含 Lightpanda 增强）
1. **第一优先级（官方渠道）**：公司官网、技术博客
   - Tesla: tesla.com/blog → **使用 Lightpanda**（React SPA，WebFetch 无法获取内容）
   - 华为: consumer.huawei.com, developer.huawei.com → WebFetch 优先
   - Waymo: waymo.com/blog → **使用 Lightpanda**（JS 框架渲染）
   - 其他：蔚来、小鹏、理想、地平线、Momenta、百度Apollo等 → WebFetch 优先
   - **抓取命令**：`node tools/lp_fetch.mjs <url> --extract-text --wait-network`
2. **第二优先级（权威媒体）**：
   - Tesla专业媒体：Electrek、Teslarati、InsideEVs → WebFetch 即可
   - 国际科技媒体：The Verge、CNBC Autos → WebFetch 即可
   - 中国科技媒体 → **使用 Lightpanda**：
     - 自动驾驶之心(blog.csdn.net/cv_autobot) → LP（CSDN JS 延迟加载）
     - 雷峰网-智能驾驶 → LP（动态加载）
     - 虎嗅网 → LP（SPA 架构）
     - 机器之心 → LP（JS 渲染）
   - 综合科技媒体：量子位(qbitai.com) → **使用 Lightpanda**（SPA）
   - GitHub技术组织：OpenDriveLab → **使用 Lightpanda**
3. **第三优先级（备用媒体）**：TechCrunch、Wired、Ars Technica → WebFetch 即可
4. **抓取策略决策**：参考 `tools/url_routing.json` 配置，Lightpanda 不可用时自动降级到 WebFetch
```

- [ ] **Step 2: 在 industry_watcher.md 的 FALLBACK 内容中同步更新**

在 `<!-- COMMON_PROFILE_FALLBACK_START -->` 内的 Workflow Template 中追加一行：
```
2.5. **智能抓取**：JS渲染页面使用 `node tools/lp_fetch.mjs <url> --extract-text`，静态页面使用WebFetch
```

- [ ] **Step 3: Commit**

```bash
git add agents_system/industry_watcher.md
git commit -m "feat(industry_watcher): integrate Lightpanda for JS-heavy sources"
```

---

### Task 10: 修改 code_scout.md — 访问策略层级2改用 LP

**Files:**
- Modify: `agents_system/code_scout.md:64-84` (访问策略与降级机制)

- [ ] **Step 1: 修改层级2从 WebFetch 网页搜索改为 Lightpanda 抓取**

将 `访问策略与降级机制` 中的层级2修改为：

```markdown
   - **层级2：Lightpanda 网页抓取**（降级，替代原 WebFetch 网页搜索）
     - 使用 Lightpanda 抓取 GitHub 搜索结果页（JS 渲染）
     - 启动服务：`bash tools/lightpanda_server.sh start`
     - 单页抓取：`node tools/lp_fetch.mjs "https://github.com/search?q={关键词}+updated:>{日期}&type=repositories" --extract-text --extract-links --wait-network`
     - 批量抓取项目详情页：`echo '["url1","url2"]' | node tools/lp_batch_fetch.mjs --extract-text --concurrency 3`
     - 解析返回 JSON 的 `links` 和 `content` 字段提取项目信息
     - 优势：可获取 JS 动态渲染的搜索结果和 README 预览
     - 降级条件：Lightpanda 服务不可用 → 降级到层级3（已知项目 API）
```

- [ ] **Step 2: 在 Skill-1 中追加 Lightpanda 说明**

在 `### Skill-1: 开源平台监控与搜索` 的第2项"搜索策略"中追加：

```markdown
   - **Lightpanda 增强**：GitHub 网页搜索和 Hugging Face 页面使用 Lightpanda 抓取（JS 渲染），
     命令：`node tools/lp_fetch.mjs <url> --extract-text --extract-links --wait-network`
```

- [ ] **Step 3: Commit**

```bash
git add agents_system/code_scout.md
git commit -m "feat(code_scout): replace WebFetch with Lightpanda for GitHub web scraping"
```

---

### Task 11: 微调 paper_hunter.md — 会议官网可选 LP

**Files:**
- Modify: `agents_system/paper_hunter.md:12-17` (Skill-1)

- [ ] **Step 1: 在 Skill-1 中追加 Lightpanda 可选说明**

在 `### Skill-1: 学术资源搜索与筛选` 的第1项"主要来源"之后追加：

```markdown
6. **Lightpanda 可选增强**：
   - arXiv 页面为静态 HTML → 继续使用 WebFetch（无需 LP）
   - CVPR/ICCV/ECCV 会议官网（thecvf.com）→ 可选使用 Lightpanda（JS 渲染论文列表）
   - 命令：`node tools/lp_fetch.mjs <会议URL> --extract-text --extract-links --wait-network`
   - 注意：arXiv API 和 Semantic Scholar API 等 JSON 接口无需 Lightpanda
```

- [ ] **Step 2: Commit**

```bash
git add agents_system/paper_hunter.md
git commit -m "feat(paper_hunter): add optional Lightpanda for conference websites"
```

---

## Chunk 5: 元数据扩展与 AGENTS.md 更新

### Task 12: 扩展 common_output.md — 新增 fetch_method 字段

**Files:**
- Modify: `agents_system/common/common_output.md:39-66` (元数据字段定义)

- [ ] **Step 1: 在 metadata 字段定义中追加 fetch_method**

在 `### 2. 元数据字段 (metadata)` 的 `module_loading` 之后追加：

```markdown
- **fetch_method** (字符串，可选)：实际使用的抓取方式
  - `"webfetch"` - 使用 WebFetch 工具直接获取（默认）
  - `"lightpanda"` - 使用 Lightpanda 无头浏览器 JS 渲染后获取
  - `"github_api"` - 使用 GitHub REST API 获取 JSON
  - `"cache"` - 使用本地缓存数据
- **fetch_detail** (对象，可选)：抓取详情
  - **tool_command** (字符串)：实际执行的抓取命令
  - **render_time_ms** (数字)：页面渲染耗时（仅 Lightpanda）
  - **fallback_used** (布尔)：是否使用了降级策略
  - **fallback_reason** (字符串)：降级原因（如 "lightpanda_unavailable", "timeout"）
```

- [ ] **Step 2: 在各 Agent 特定输出格式示例中追加 fetch_method 示例**

在 `### Industry_Watcher 输出格式` 的 metadata 示例中追加：
```json
    "fetch_method": "lightpanda",
    "fetch_detail": {
      "tool_command": "node tools/lp_fetch.mjs https://tesla.com/blog --extract-text",
      "render_time_ms": 2300,
      "fallback_used": false,
      "fallback_reason": null
    }
```

- [ ] **Step 3: Commit**

```bash
git add agents_system/common/common_output.md
git commit -m "feat(output): add fetch_method metadata for tracking fetch strategy"
```

---

### Task 13: 更新 AGENTS.md — 新增 tools/ 目录说明

**Files:**
- Modify: `AGENTS.md` (文件结构和命令部分)

- [ ] **Step 1: 在"File Structure Reference"部分追加 tools/ 目录**

在现有文件结构树中追加：

```markdown
├── tools/                          # Lightpanda 抓取工具集
│   ├── install_lightpanda.sh       # 安装 Lightpanda 浏览器
│   ├── lightpanda_server.sh        # CDP 服务器启停管理
│   ├── lp_fetch.mjs               # 单页 CDP 抓取（核心工具）
│   ├── lp_batch_fetch.mjs         # 批量并发抓取
│   ├── url_routing.json           # URL 路由配置
│   └── package.json               # Node.js 依赖
```

- [ ] **Step 2: 在"Build/Test/Lint Commands"部分追加 Lightpanda 命令**

在 `### Directory Management` 之后追加：

```markdown
### Lightpanda 浏览器管理
```bash
# 安装 Lightpanda（首次使用）
bash tools/install_lightpanda.sh

# 启动/停止/查看 CDP 服务器
bash tools/lightpanda_server.sh start
bash tools/lightpanda_server.sh status
bash tools/lightpanda_server.sh stop

# 单页抓取（JS 渲染页面）
node tools/lp_fetch.mjs https://target-url.com --extract-text --wait-network

# 批量抓取
echo '["url1","url2","url3"]' | node tools/lp_batch_fetch.mjs --extract-text --concurrency 3

# 安装 Node.js 依赖（首次使用）
cd tools && npm install
```
```

- [ ] **Step 3: 在"Code Style Guidelines"部分追加 tools/ 命名规范**

```markdown
- **工具脚本**: `snake_case.sh` 或 `snake_case.mjs` in `tools/`
- **配置文件**: `snake_case.json` in `tools/`
```

- [ ] **Step 4: 更新版本信息**

将 `Updated:` 行更新为：
```
Updated: 2026-03-16 (Integrated Lightpanda headless browser for JS-rendered page scraping; Added tools/ directory with CDP fetch utilities)
```

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs(AGENTS): add Lightpanda tools documentation and commands"
```

---

## Chunk 6: 端到端验证与收尾

### Task 14: 端到端集成测试 — Industry_Watcher 场景

**Files:**
- 无新文件，验证现有集成

- [ ] **Step 1: 安装所有依赖**

Run:
```bash
bash tools/install_lightpanda.sh
cd tools && npm install && cd ..
```
Expected: Lightpanda binary installed, puppeteer-core installed

- [ ] **Step 2: 启动 Lightpanda 服务**

Run: `bash tools/lightpanda_server.sh start`
Expected: "启动成功" with PID and ws:// address

- [ ] **Step 3: 测试 Industry_Watcher 典型场景 — 中国科技媒体**

Run:
```bash
# 测试 CSDN（JS 延迟加载）
node tools/lp_fetch.mjs "https://blog.csdn.net/cv_autobot/article/list/" --extract-text --extract-links --wait-network --timeout 45000

# 测试 OpenDriveLab（JS 渲染）
node tools/lp_fetch.mjs "https://opendrivelab.com/" --extract-text --extract-links --wait-network
```
Expected: 两个请求都返回 `"status": "success"` 且 `content` 非空

- [ ] **Step 4: 测试降级场景 — 停止 LP 后用 WebFetch**

Run:
```bash
bash tools/lightpanda_server.sh stop
# 此时 lp_fetch.mjs 应返回 error
node tools/lp_fetch.mjs "https://blog.csdn.net/cv_autobot" 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])"
```
Expected: 输出 "error"（确认降级触发条件正确）

- [ ] **Step 5: 记录测试结果**

在终端记录每个测试的 status、耗时、content 长度，确认集成正常

---

### Task 15: 端到端集成测试 — Code_Scout 批量场景

- [ ] **Step 1: 启动 Lightpanda**

Run: `bash tools/lightpanda_server.sh start`

- [ ] **Step 2: 测试 GitHub 搜索页抓取**

Run:
```bash
node tools/lp_fetch.mjs "https://github.com/search?q=autonomous+driving+updated%3A%3E2026-03-01&type=repositories" --extract-text --extract-links --wait-network --timeout 45000
```
Expected: JSON with links array containing GitHub repo URLs

- [ ] **Step 3: 测试批量项目页抓取**

Run:
```bash
echo '["https://github.com/opendrivelab/UniAD", "https://github.com/NVIDIA/DRIVE", "https://github.com/carla-simulator/carla"]' | node tools/lp_batch_fetch.mjs --extract-text --concurrency 2
```
Expected: JSON array with 3 results, majority `"status": "success"`

- [ ] **Step 4: 停止 Lightpanda 并清理**

Run: `bash tools/lightpanda_server.sh stop`

- [ ] **Step 5: Commit 所有剩余修改**

```bash
git add -A
git commit -m "feat: complete Lightpanda browser integration for AutoIntel-Squad

- Added tools/: install script, server manager, CDP fetch tools
- Updated common_rules.md: Rule-17 smart fetch strategy
- Updated common_workflow.md: Phase 2 Lightpanda integration
- Updated common_output.md: fetch_method metadata field
- Updated industry_watcher.md: LP for JS-heavy Chinese media sources
- Updated code_scout.md: LP replaces WebFetch for GitHub web scraping
- Updated paper_hunter.md: optional LP for conference websites
- Updated AGENTS.md: tools/ documentation"
```

---

## 风险与注意事项

### 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Lightpanda Beta 稳定性 | 部分复杂网站可能崩溃 | 保留 WebFetch 降级路径，LP 失败自动切换 |
| LP 不支持某些 Web API | 部分 SPA 页面渲染不完整 | 测试目标网站兼容性，不兼容的保持 WebFetch |
| Node.js 依赖引入 | 增加系统复杂度 | 仅依赖 puppeteer-core（无 Chromium 下载） |
| CDP 端口冲突 | 9222 端口被占用 | 支持 LP_PORT 环境变量自定义端口 |
| 中国网站访问限制 | 部分网站可能需要代理 | LP 支持 proxy，可后续配置 |

### 不在本次范围内

- Lightpanda Docker 部署（可后续添加）
- 自动化定时抓取（cron/CI）
- 代理/VPN 配置
- Lightpanda 版本锁定（当前使用 nightly）
- lp_fetch 结果缓存层（可复用 Code_Scout 现有缓存机制）

### 执行顺序建议

```
Task 1-2 (安装与服务管理) → 可独立执行
Task 3-5 (Node.js 工具) → 依赖 Task 1-2
Task 6 (URL 路由配置) → 可独立执行
Task 7-8 (共享模块修改) → 可独立执行
Task 9-11 (Agent 提示词修改) → 依赖 Task 7-8
Task 12-13 (元数据与文档) → 可独立执行
Task 14-15 (端到端测试) → 依赖所有前置 Task
```

**并行执行建议：**
- 并行组 A: Task 1-5（基础设施 + 工具）
- 并行组 B: Task 6-8（配置 + 共享模块）
- 并行组 C: Task 12-13（元数据 + 文档）
- 串行: Task 9-11（依赖组 B）→ Task 14-15（依赖全部）