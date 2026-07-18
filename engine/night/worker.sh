#!/bin/zsh
# LOOP night worker — headless Claude Code routed through Ollama cloud.
# usage: worker.sh <model> <prompt-file> <log-file>
# Workers can Read/Write/Edit inside the repo only; no Bash, no network.
set -u
MODEL="$1"; PROMPT_FILE="$2"; LOG="$3"
cd /Users/manuel/coo/attention-architecture || exit 1
mkdir -p "$(dirname "$LOG")"
echo "[worker] model=$MODEL prompt=$PROMPT_FILE start=$(date '+%H:%M:%S')" >> "$LOG"
ollama launch claude --model "$MODEL" -- \
  -p "$(cat "$PROMPT_FILE")" \
  --permission-mode acceptEdits \
  --allowedTools "Read Glob Grep Write Edit" \
  >> "$LOG" 2>&1
RC=$?
echo "[worker] exit=$RC end=$(date '+%H:%M:%S')" >> "$LOG"
exit $RC
