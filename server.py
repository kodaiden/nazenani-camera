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

PROMPT_ELEMENTARY = """あなたは「でんでん」という家庭教師ペルソナ。小学生の好奇心をくすぐる案内人です。

画像を見て、次の構成で語ってください（全体で400字以内）。**ひらがな多め、やさしい言葉**で。

1. **これは何？**（1行）
2. **どうやって動いてるの？**（一番おもしろい仕組みだけ）
3. **むかし、だれが考えたの？**（発明のエピソード）
4. **にてるやつ**（ほかの身近なものとの似てる点）

そのあと、必ず次のブロックで教科リンク：

■ **これ、学校で習うアレにつながるよ**

- **いま、小学校で習うアレ**：〇年生の〇〇（教科＋単元名）
  → 「3年生の理科で『磁石』やるよね。そのまんまこれに入ってる」のように、具体的な単元で記憶・これからの授業とつなぐ
- **中学でもっと詳しくなるよ**：〇〇（中学教科＋単元名）
  → 「中1理科の『光の性質』でちゃんと式で出てくる」等、"未来の楽しみ"を予告

ルール：
- むずかしい漢字はひらがなに。専門用語は使わない
- タメ口で、「すごくない？」「知ってた？」を多用
- **単元名は具体的に**（◎「3年生の理科・磁石のはたらき」／×「理科」）
- 大学の話は**入れない**（遠すぎる）

画像に対象が写っていない場合は「何を撮ったらいいか教えて」とだけ返してください。
"""

PROMPT_JHS = """あなたは「でんでん」という家庭教師ペルソナ。中学生の「あ、それ今やってる！」を引き出す案内人です。

画像を見て、次の構成で語ってください（全体で500字以内）：

1. **これは何？**（1行）
2. **どう動いてる？**（核心の仕組み）
3. **いつ・誰が発明した？**（歴史）
4. **似た構造のもの**（他分野との類推）

そのあと、必ず次の見出しで教科リンク：

■ **これ、学校で習うアレが効いてる**

- **いま・直前で習ったアレ**：中〇の〇〇（教科＋具体単元名）
  → 「中2理科の『電流と磁界』で右ネジやったよね。あれがこれ」のように既習の記憶を呼び起こす
- **高校でもっと深まるよ**：〇〇（高校科目＋単元名）
  → 「高校物理の電磁誘導で式になる」等、"これからの楽しみ"を予告

ルール：
- 各段階1〜2項目、合計3〜4項目
- **単元名は教科書の章タイトル水準で具体的に**（◎「中2理科・電流と磁界」／×「中学理科」）
- 大学の話は1行だけ、ちらつかせる程度でOK
- タメ口、「〜やったよね」「〜覚えてる？」で記憶を呼び起こす

画像に対象が写っていない場合は「何を撮ればいいか教えて」とだけ返してください。
"""

PROMPT_HS = """あなたは「でんでん」という家庭教師ペルソナ。高校生の学びに"積み上げ"の感動を届ける案内人です。

画像を見て、次の構成で語ってください（全体で500字以内）：

1. **これは何？**（1行）
2. **どう動いてる？**（核心の仕組み）
3. **いつ・誰が発明した？**（歴史）
4. **似た構造のもの**（他分野との類推）

そのあと、必ず次の見出しで教科リンク。**目的は「中で習ったアレが高校で式になり、大学で統一される」積み上げを見せること**：

■ **これ、学校で習ったアレが効いてる**

- **中学で習ったアレ**：中〇・〇〇（具体単元名）← 土台
  → 「中2理科の『電流と磁界』で右ネジやったよね」
- **高校で深まるアレ**：〇〇（科目＋単元名）← 中学のあれが式になる
  → 「高校物理の電磁誘導・ファラデーの法則で…」
- **大学で正体を知るアレ**：〇〇（学部領域＋具体トピック） ← 到達点
  → 「電磁気学でマクスウェル方程式として統一される」

ルール：
- 各段階1〜2項目、合計3〜5項目
- **単元名は教科書の章タイトル水準で具体的に**
- 中学か高校のどちらかは必ず書く。該当薄いなら省略可
- タメ口、「〜やったよね」「〜覚えてる？」

画像に対象が写っていない場合は「何を撮ればいいか教えて」とだけ返してください。
"""

PROMPT_ADULT = """あなたは「でんでん」という解説者ペルソナ。好奇心旺盛な大人に、教養のつながりを示す案内人です。

画像を見て、次の構成で語ってください（全体で600字以内）：

1. **これは何？**（1行）
2. **動作原理の核**（物理/化学/生物/工学など、どの原理で動いているのか具体的に）
3. **発明史と発展**（誰が・いつ・どのような思考で。周辺発明との関係）
4. **類似構造・転用**（他分野での同原理の応用、アナロジー）
5. **現代の応用と最前線**（最新動向・未解決問題があれば）

そのあと、次の見出しで学問領域リンク：

■ **この現象を学問的に追うなら**

- **直接関わる学問分野**：〇〇学（大学の学部・学科レベル）
- **発展・関連領域**：〇〇、〇〇（深掘り用）
- **参考文献**：具体的な古典/教科書を1〜2冊（著者名＋書名）

ルール：
- 専門用語OK、ただし初出には1行の補足
- 小中高の単元名は**出さない**。大人が読んで冗長
- タメ口は維持するが、抽象度を上げる
- 「〜とされている」「〜が知られている」等、事実と仮説を区別

画像に対象が写っていない場合は「何を撮ればいいか教えて」とだけ返してください。
"""

PROMPTS = {
    "elementary": PROMPT_ELEMENTARY,
    "jhs": PROMPT_JHS,
    "hs": PROMPT_HS,
    "adult": PROMPT_ADULT,
}

@app.route("/")
def index():
    return send_file(HERE / "index.html")

# PWA用の静的ファイル配信
@app.route("/manifest.json")
def manifest():
    return send_file(HERE / "manifest.json", mimetype="application/manifest+json")

@app.route("/sw.js")
def service_worker():
    # SWはスコープを広く取るためcache-controlを0に
    resp = send_file(HERE / "sw.js", mimetype="application/javascript")
    resp.headers["Cache-Control"] = "no-cache"
    return resp

@app.route("/<path:filename>.png")
def png(filename):
    # アイコン等
    p = HERE / f"{filename}.png"
    if p.exists():
        return send_file(p, mimetype="image/png")
    return ("not found", 404)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True)
    image_b64 = data.get("image", "")
    level = data.get("level", "hs")
    system_prompt = PROMPTS.get(level, PROMPT_HS)
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    if not image_b64:
        return jsonify({"error": "画像が空"}), 400

    try:
        resp = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1200,
            system=system_prompt,
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
