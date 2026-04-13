@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ============================================
echo   なぜ？なに？カメラ MVP
echo ============================================
echo.

REM APIキーチェック
if "%ANTHROPIC_API_KEY%"=="" (
  echo ⚠ ANTHROPIC_API_KEY が設定されていません。
  echo.
  set /p APIKEY="APIキーを貼り付けてEnter (console.anthropic.com): "
  set ANTHROPIC_API_KEY=%APIKEY%
)

REM 依存インストール（初回のみ）
pip show flask > nul 2>&1
if errorlevel 1 (
  echo 📦 初回セットアップ中...
  pip install -q -r requirements.txt
)

REM ngrok チェック
where ngrok > nul 2>&1
if errorlevel 1 (
  echo ⚠ ngrok がインストールされていません
  echo   winget install Ngrok.Ngrok で入れてください
  pause
  exit /b 1
)

REM ngrok トークン設定チェック
if not exist "%LOCALAPPDATA%\ngrok\ngrok.yml" (
  echo ⚠ ngrok の認証トークンが未設定
  echo   https://dashboard.ngrok.com/get-started/your-authtoken で取得してください
  echo.
  set /p NGTOKEN="トークンを貼り付けてEnter: "
  ngrok config add-authtoken %NGTOKEN%
)

echo.
echo ✅ 起動中...
echo  別ウィンドウで ngrok が起動します（https URLはそちらに表示）
echo  iPhone からは ngrok の https URL を開いてください
echo ============================================
echo.

REM ngrok を別ウィンドウで起動
start "ngrok" cmd /k "ngrok http 5000"

REM Flask 起動
python server.py
pause
