#!/usr/bin/env bash
# lightpanda_server.sh — 管理 Lightpanda CDP 服务器的启停
set -euo pipefail

LIGHTPANDA="${LIGHTPANDA_BIN:-$HOME/.local/bin/lightpanda}"
GLIBC_DIR="${LP_GLIBC_DIR:-$HOME/.local/lib/lightpanda-glibc}"
HOST="${LP_HOST:-127.0.0.1}"
PORT="${LP_PORT:-9222}"
PID_FILE="/tmp/lightpanda.pid"
LOG_FILE="/tmp/lightpanda.log"

# 构建 Lightpanda 启动命令（自动检测是否需要 glibc wrapper）
build_lp_cmd() {
  if "$LIGHTPANDA" --help >/dev/null 2>&1; then
    # 系统 glibc 兼容，直接运行
    echo "$LIGHTPANDA"
  elif [ -x "$GLIBC_DIR/ld-linux-x86-64.so.2" ]; then
    # 使用自定义 glibc（Ubuntu 20.04 等低版本系统）
    echo "$GLIBC_DIR/ld-linux-x86-64.so.2 --library-path $GLIBC_DIR $LIGHTPANDA"
  else
    echo ""
  fi
}

start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[AutoIntel] Lightpanda 已在运行 (PID: $(cat "$PID_FILE"))"
    return 0
  fi
  if [ ! -x "$LIGHTPANDA" ]; then
    echo "[错误] Lightpanda 未安装，请先运行: bash tools/install_lightpanda.sh"
    exit 1
  fi
  LP_CMD=$(build_lp_cmd)
  if [ -z "$LP_CMD" ]; then
    echo "[错误] 无法运行 Lightpanda：系统 glibc 版本过低且未找到兼容 glibc"
    echo "[提示] 请运行 bash tools/install_lightpanda.sh 安装兼容 glibc"
    exit 1
  fi
  echo "[AutoIntel] 启动 Lightpanda CDP 服务器 ($HOST:$PORT)..."
  LIGHTPANDA_DISABLE_TELEMETRY=true nohup $LP_CMD serve \
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
