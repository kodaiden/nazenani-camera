# 📷 なぜ？なに？カメラ（MVP）

スマホのカメラでかざしたものの**仕組み**を、でんでん式（タメ口・好奇心誘発）で解説してくれるアプリ。

## クイックスタート

### 1. Anthropic APIキーを取得
[console.anthropic.com](https://console.anthropic.com/) でアカウント作成 → API Keys → 新規発行
※ 新規は $5 無料クレジット付き（≒ 1,000回の解析分）

### 2. 起動
`起動.bat` をダブルクリック。初回はAPIキー入力を求められる。

### 3. アクセス
- **PC**: ブラウザで `http://localhost:5000/`
- **スマホ**: 同じWi-Fi上で `http://<PCのIP>:5000/` （起動時に表示）

### 4. 使う
- 物にスマホをかざす → 下の📸ボタンをタップ
- 3-5秒で解説が出る

## コスト目安

1回の解析 ≈ **約1.8円**（Claude Sonnet 4.5 Vision、画像+解説文）
日常使用（1日5枚）で月270円程度。

## 今後の計画

- [ ] 図鑑機能（見た「仕組み」を蓄積）
- [ ] 音声読み上げ
- [ ] PWA化（ホーム画面追加）
- [ ] ユーザー認証＋課金（Stripe）
- [ ] ネイティブアプリ化（React Native）
- [ ] 公開ホスティング（Vercel/Cloudflare）

## ファイル

- `server.py` — Flaskバックエンド
- `index.html` — カメラUI
- `起動.bat` — Windows用起動スクリプト
- `requirements.txt` — Python依存

## 技術スタック

- Python 3.10+ / Flask
- Anthropic Claude (Sonnet 4.5 Vision)
- 素のHTML/JS (カメラAPI)
