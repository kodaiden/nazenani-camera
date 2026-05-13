#!/bin/bash
# なぜ？なに？カメラ MVP — Mac 用起動スクリプト
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  なぜ？なに？カメラ MVP (Mac)"
echo "============================================"
echo

# --- API キー ---
KEY_FILE="$HOME/.anthropic_camera_key"
if [ -z "$ANTHROPIC_API_KEY" ]; then
  if [ -f "$KEY_FILE" ]; then
    export ANTHROPIC_API_KEY=$(cat "$KEY_FILE")
    echo "✅ 保存済み API キーを読み込みました"
  else
    echo "⚠ ANTHROPIC_API_KEY が設定されていません"
    echo "  https://console.anthropic.com/ で取得"
    read -r -p "API キーを貼り付けて Enter: " APIKEY
    export ANTHROPIC_API_KEY="$APIKEY"
    printf "%s" "$APIKEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "💾 API キーを保存しました: $KEY_FILE"
  fi
fi

# --- ポート設定(macOS の AirPlay Receiver が 5000 を占有するため 5001 を使う) ---
export PORT=5001

# --- uv チェック ---
if ! command -v uv >/dev/null 2>&1; then
  echo "❌ uv が見つかりません。brew install uv を実行してください"
  exit 1
fi

# --- venv (Google Drive 外に作成) ---
VENV_DIR="$HOME/.cache/nazenani-camera-venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "📦 初回セットアップ中(venv 作成 + 依存インストール)..."
  mkdir -p "$(dirname "$VENV_DIR")"
  uv venv "$VENV_DIR"
  uv pip install --python "$VENV_DIR/bin/python" -r requirements.txt
fi

# --- ngrok チェック ---
if ! command -v ngrok >/dev/null 2>&1; then
  cat <<EOF
❌ ngrok がインストールされていません

  brew install ngrok/ngrok/ngrok

を実行してから、もう一度このスクリプトを起動してください。
※ iPhone のカメラ API は HTTPS 必須のため、ngrok での HTTPS 化が必要です
EOF
  exit 1
fi

# --- ngrok 認証トークン ---
NGROK_CFG="$HOME/Library/Application Support/ngrok/ngrok.yml"
if [ ! -f "$NGROK_CFG" ]; then
  echo "⚠ ngrok の認証トークンが未設定"
  echo "  https://dashboard.ngrok.com/get-started/your-authtoken で取得"
  read -r -p "トークンを貼り付けて Enter: " NGTOKEN
  ngrok config add-authtoken "$NGTOKEN"
fi

echo
echo "✅ 起動中..."
echo "   別ウィンドウで ngrok を起動します(https URL はそちらに表示)"
echo "   iPhone からは ngrok の https URL を開いてください"
echo "   Mac からは http://localhost:5001/ でも OK"
echo "============================================"
echo

# --- ngrok を新しい Terminal ウィンドウで起動 ---
osascript <<'OSA'
tell application "Terminal"
    do script "echo '=== ngrok (このウィンドウを閉じると iPhone からアクセス不可になります) ===' && ngrok http 5001"
end tell
OSA

# --- Flask サーバー起動 ---
"$VENV_DIR/bin/python" server.py
