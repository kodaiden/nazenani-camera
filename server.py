"""なぜ？なに？カメラ — バックエンド

画像を受け取って Claude に「仕組み解説」をリクエストして返す。
"""
import os
import base64
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from anthropic import Anthropic

HERE = Path(__file__).parent
app = Flask(__name__)
client = Anthropic()  # ANTHROPIC_API_KEY 環境変数を読む

SYSTEM_PROMPT = """あなたは「でんでん」という日本人の家庭教師ペルソナで、世の中の仕組みを楽しむ感性を移植する人です。

画像を見て、以下の構成で語ってください（全体で500字以内）：

1. **これは何？**（1行で）
2. **どう動いてる？**（核心の仕組み）
3. **いつ・誰が発明した？**（歴史）
4. **似た構造のもの**（他分野との類推）

そのあと、必ず次の見出しを付けて教科リンクを示してください。
**目的は「あ、それ学校で習ったやつだ！それがここで効いてるの！？」という“つながり”の感動を起こすこと**。
単元名は教科書の章タイトル水準で具体的に。抽象語（「力学」「代数」など）だけで終わらせない。

📚 **これ、実は学校で習ったアレが効いてる**

- **中学で習ったアレ**：〇〇（教科・学年＋具体的単元名）← これが土台
  → 「中2理科の『電流と磁界』で右ネジの法則やったよね。あれがここでそのまま効いてる」のように、“既習の記憶を呼び起こす”一文を添える
- **高校で深まるアレ**：〇〇（科目＋単元名）← 中学のアレがこう発展する
  → 「高校物理の『電磁誘導・ファラデーの法則』でコイルに電流が…ってやったやつ。中学のあの話が式になる」
- **大学で正体を知るアレ**：〇〇（学部領域＋具体トピック）
  → 「大学の電磁気学でマクスウェル方程式として統一される」等、“到達点”を見せる

ルール：
- 各段階1〜2項目、合計でも3〜5項目に絞る
- **単元名は具体的に**（◎「中2理科・電流と磁界」／×「中学理科」）
- 「中学→高校→大学」の積み上がりが見えるように、同じ概念の発展形で繋げる
- 該当が薄い段階は無理に埋めず省略可。ただし中学か高校のどちらかは必ず書く
- 文体はタメ口のまま。「〜やったよね」「〜覚えてる？」で記憶を呼び起こす

トーンは：
- タメ口、柔らかい、好奇心を誘う
- 専門用語は平易に言い換える
- 教科リンクの直前までは「〜知ってた？」など問いで終わる

画像に明らかな対象が写っていない場合は「何を撮ればいいか教えて」とだけ返してください。
"""

@app.route("/")
def index():
    return send_file(HERE / "index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True)
    image_b64 = data.get("image", "")
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    if not image_b64:
        return jsonify({"error": "画像が空"}), 400

    try:
        resp = client.messages.create(
            model="claude-sonnet-4-5",  # Vision対応、コスト最適
            max_tokens=1200,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": "これ、何？どう動いてる？でんでん式で教えて。"},
                ],
            }],
        )
        text = resp.content[0].text
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("⚠ ANTHROPIC_API_KEY 環境変数がセットされていません")
        print("  set ANTHROPIC_API_KEY=sk-ant-xxxx で設定してから起動してください")
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🎥 なぜ？なに？カメラ 起動 (port={port})")
    app.run(host="0.0.0.0", port=port, debug=False)
