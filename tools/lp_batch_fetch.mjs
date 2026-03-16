#!/usr/bin/env node
/**
 * lp_batch_fetch.mjs — AutoIntel-Squad 批量抓取工具
 *
 * 使用 Lightpanda 的 `fetch --dump` 直接模式，逐个抓取 URL 列表。
 *
 * 用法:
 *   echo '["url1","url2"]' | node tools/lp_batch_fetch.mjs [options]
 *   node tools/lp_batch_fetch.mjs --urls-file urls.json [options]
 *
 * 选项:
 *   --concurrency <n>   并发数，默认 3
 *   --timeout <ms>      单页超时，默认 30000
 *   --extract-text      提取 markdown 纯文本
 *   --extract-links     提取链接
 *   --urls-file <path>  从 JSON 文件读取 URL 列表
 *
 * 输出: JSON 数组到 stdout
 */
import { execFile } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
const hasFlag = (flag) => args.includes(flag);

const CONCURRENCY = parseInt(getArg('--concurrency', '3'), 10);
const TIMEOUT = parseInt(getArg('--timeout', '30000'), 10);
const EXTRACT_TEXT = hasFlag('--extract-text');
const EXTRACT_LINKS = hasFlag('--extract-links');
const URLS_FILE = getArg('--urls-file', null);

function buildCommand() {
  const home = homedir();
  const lpBin = process.env.LIGHTPANDA_BIN || `${home}/.local/bin/lightpanda`;
  const glibcDir = process.env.LP_GLIBC_DIR || `${home}/.local/lib/lightpanda-glibc`;
  const ldLinux = `${glibcDir}/ld-linux-x86-64.so.2`;
  if (!existsSync(lpBin)) return null;
  if (existsSync(ldLinux)) {
    return { cmd: ldLinux, args: ['--library-path', glibcDir, lpBin] };
  }
  return { cmd: lpBin, args: [] };
}

function extractLinks(markdown) {
  const linkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({ text: match[1].slice(0, 80), href: match[2] });
  }
  const seen = new Set();
  return links.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  }).slice(0, 100);
}

async function getUrls() {
  if (URLS_FILE) {
    return JSON.parse(readFileSync(URLS_FILE, 'utf-8'));
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function fetchOne(lpCmd, url) {
  const dumpFormat = (EXTRACT_TEXT || EXTRACT_LINKS) ? 'markdown' : 'html';
  const fetchArgs = [...lpCmd.args, 'fetch', '--dump', dumpFormat, url];
  try {
    const { stdout } = await execFileAsync(lpCmd.cmd, fetchArgs, {
      timeout: TIMEOUT,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, LIGHTPANDA_DISABLE_TELEMETRY: 'true' },
    });
    const content = stdout.trim().slice(0, EXTRACT_TEXT ? 5000 : 50000);
    const links = EXTRACT_LINKS ? extractLinks(content) : [];
    const firstLine = content.split('\n').find(l => l.trim().length > 0) || '';
    const title = firstLine.replace(/^#+\s*/, '').replace(/\[([^\]]*)\].*/, '$1').slice(0, 200);
    return { status: 'success', url, title, content, links };
  } catch (err) {
    return { status: 'error', url, error: err.killed ? `超时 (${TIMEOUT}ms)` : err.message };
  }
}

try {
  const lpCmd = buildCommand();
  if (!lpCmd) {
    console.log(JSON.stringify({ status: 'error', error: 'Lightpanda 未安装' }));
    process.exit(1);
  }
  const urls = await getUrls();
  if (!Array.isArray(urls) || urls.length === 0) {
    console.log(JSON.stringify([]));
    process.exit(0);
  }
  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(u => fetchOne(lpCmd, u)));
    results.push(...batchResults);
  }
  console.log(JSON.stringify(results, null, 2));
} catch (err) {
  console.log(JSON.stringify({ status: 'error', error: err.message }));
  process.exit(1);
}
