#!/usr/bin/env node
/**
 * lp_fetch.mjs — AutoIntel-Squad Lightpanda 单页抓取工具
 *
 * 使用 Lightpanda 的 `fetch --dump` 直接模式（稳定），而非 CDP 模式。
 *
 * 用法:
 *   node tools/lp_fetch.mjs <url> [options]
 *
 * 选项:
 *   --timeout <ms>      超时毫秒数，默认 30000
 *   --extract-text      输出 markdown 格式纯文本（默认输出 HTML）
 *   --extract-links     从 markdown 输出中提取链接
 *
 * 输出: JSON 到 stdout
 *   { "url", "title", "content", "links", "timestamp", "status" }
 */
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http'));

if (!url) {
  console.log(JSON.stringify({
    status: 'error',
    error: '用法: node lp_fetch.mjs <url> [--timeout ms] [--extract-text] [--extract-links]'
  }));
  process.exit(1);
}

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
const hasFlag = (flag) => args.includes(flag);

const TIMEOUT = parseInt(getArg('--timeout', '30000'), 10);
const EXTRACT_TEXT = hasFlag('--extract-text');
const EXTRACT_LINKS = hasFlag('--extract-links');

// 构建 Lightpanda 命令（自动检测 glibc wrapper）
function buildCommand() {
  const home = homedir();
  const lpBin = process.env.LIGHTPANDA_BIN || `${home}/.local/bin/lightpanda`;
  const glibcDir = process.env.LP_GLIBC_DIR || `${home}/.local/lib/lightpanda-glibc`;
  const ldLinux = `${glibcDir}/ld-linux-x86-64.so.2`;

  if (!existsSync(lpBin)) {
    return null;
  }

  // 检查是否需要 glibc wrapper
  if (existsSync(ldLinux)) {
    return { cmd: ldLinux, args: ['--library-path', glibcDir, lpBin] };
  }
  return { cmd: lpBin, args: [] };
}

// 从 markdown 内容中提取链接
function extractLinks(markdown) {
  const linkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({ text: match[1].slice(0, 100), href: match[2] });
  }
  // 去重
  const seen = new Set();
  return links.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  }).slice(0, 200);
}

// 从 HTML 中提取 title
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

async function fetchPage() {
  const lpCmd = buildCommand();
  if (!lpCmd) {
    console.log(JSON.stringify({
      status: 'error',
      url,
      error: 'Lightpanda 未安装，请运行: bash tools/install_lightpanda.sh',
      timestamp: new Date().toISOString(),
    }));
    process.exit(1);
  }

  const dumpFormat = (EXTRACT_TEXT || EXTRACT_LINKS) ? 'markdown' : 'html';
  const fetchArgs = [...lpCmd.args, 'fetch', '--dump', dumpFormat, url];

  try {
    const { stdout, stderr } = await execFileAsync(lpCmd.cmd, fetchArgs, {
      timeout: TIMEOUT,
      maxBuffer: 20 * 1024 * 1024, // 20MB
      env: { ...process.env, LIGHTPANDA_DISABLE_TELEMETRY: 'true' },
    });

    const content = stdout.trim().slice(0, 50000);
    let title = '';
    let links = [];

    if (dumpFormat === 'html') {
      title = extractTitle(content);
    } else {
      // markdown 模式：第一行通常是标题
      const firstLine = content.split('\n').find(l => l.trim().length > 0) || '';
      title = firstLine.replace(/^#+\s*/, '').replace(/\[([^\]]*)\].*/, '$1').slice(0, 200);
    }

    if (EXTRACT_LINKS) {
      links = extractLinks(content);
    }

    console.log(JSON.stringify({
      status: 'success',
      url,
      title,
      content: EXTRACT_TEXT ? content.slice(0, 10000) : content,
      links,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    const errorMsg = err.killed ? `超时 (${TIMEOUT}ms)` : err.message;
    console.log(JSON.stringify({
      status: 'error',
      url,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }));
    process.exit(1);
  }
}

fetchPage();
