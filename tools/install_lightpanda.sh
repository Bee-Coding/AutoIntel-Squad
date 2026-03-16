#!/usr/bin/env bash
# install_lightpanda.sh — 下载并安装 Lightpanda nightly binary
# 支持 glibc 版本过低的系统（如 Ubuntu 20.04）自动下载兼容 glibc
set -euo pipefail

INSTALL_DIR="${LIGHTPANDA_HOME:-$HOME/.local/bin}"
GLIBC_DIR="${LP_GLIBC_DIR:-$HOME/.local/lib/lightpanda-glibc}"
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

# 下载 Lightpanda binary（如果不存在）
if [ ! -x "$INSTALL_DIR/lightpanda" ]; then
  echo "[AutoIntel] 下载 Lightpanda 到 $INSTALL_DIR/lightpanda ..."
  curl -L -o "$INSTALL_DIR/lightpanda" "$URL"
  chmod a+x "$INSTALL_DIR/lightpanda"
else
  echo "[AutoIntel] Lightpanda binary 已存在: $INSTALL_DIR/lightpanda"
fi

# 验证安装 — 检查是否需要 glibc 兼容层
if "$INSTALL_DIR/lightpanda" --help >/dev/null 2>&1; then
  echo "[AutoIntel] Lightpanda 安装成功（系统 glibc 兼容）"
else
  echo "[AutoIntel] 系统 glibc 版本过低，安装兼容 glibc..."

  if [ "$PLATFORM" != "Linux-x86_64" ]; then
    echo "[错误] glibc 兼容层仅支持 Linux x86_64"
    exit 1
  fi

  mkdir -p "$GLIBC_DIR"

  if [ ! -f "$GLIBC_DIR/libc.so.6" ]; then
    TMPDIR=$(mktemp -d)
    echo "[AutoIntel] 从 Ubuntu 22.04 仓库下载 glibc 2.35..."
    curl -sL -o "$TMPDIR/libc6.deb" \
      "http://archive.ubuntu.com/ubuntu/pool/main/g/glibc/libc6_2.35-0ubuntu3.13_amd64.deb"
    dpkg-deb -x "$TMPDIR/libc6.deb" "$TMPDIR/extract/"
    cp "$TMPDIR/extract/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2" "$GLIBC_DIR/"
    cp "$TMPDIR/extract/lib/x86_64-linux-gnu/libc.so.6" "$GLIBC_DIR/"
    cp "$TMPDIR/extract/lib/x86_64-linux-gnu/libm.so.6" "$GLIBC_DIR/"
    rm -rf "$TMPDIR"
    echo "[AutoIntel] glibc 2.35 已安装到 $GLIBC_DIR"
  else
    echo "[AutoIntel] 兼容 glibc 已存在: $GLIBC_DIR"
  fi

  # 验证 glibc wrapper 方式
  if "$GLIBC_DIR/ld-linux-x86-64.so.2" --library-path "$GLIBC_DIR" "$INSTALL_DIR/lightpanda" --help >/dev/null 2>&1; then
    echo "[AutoIntel] Lightpanda 安装成功（使用兼容 glibc wrapper）"
    echo "[AutoIntel] 服务管理脚本会自动检测并使用 glibc wrapper"
  else
    echo "[错误] Lightpanda 安装失败，请检查系统环境"
    exit 1
  fi
fi
