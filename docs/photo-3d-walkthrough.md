# 写真1枚から歩き回る 3D ウォークスルー

一般の人に「こんな短時間で？」と見せるための Web アプリです。費用は無料枠だけを使います。

## できること（利用者から見た範囲）

写真を1枚選ぶと、奥行きのある立体になり、ブラウザの中を少し歩き回れます。夕方・雪・ネオンなどの雰囲気も切り替えます。

写真1枚では、物の裏側まで再現できません。無料で作る上限は、正面の世界に入り込む体験です。部屋を一周させたい場合は、後から写真を増やすか有料の 3D 生成が必要です。

## 開発者が使うもの

| 役割 | 使うもの |
|---|---|
| 開発 | Cursor |
| 画面 | Vite + TypeScript（React でも可） |
| 3D | Three.js（または React Three Fiber） |
| 奥行き推定 | Transformers.js + Depth Anything V2 Small |
| 計算 | WebGPU（なければ WASM） |
| 公開 | このリポジトリ → Cloudflare Pages |
| 任意 | Gemini（写真の説明・照明の指示）。画像生成は無料枠にないので使わない |

奥行き推定のモデル本体（約 100MB）はリポジトリに入れません。利用者が初回アクセスしたとき、Hugging Face からブラウザへ直接ダウンロードします。

## 利用者が使うもの

| 使うもの | 内容 |
|---|---|
| 端末 | PC、または最近の Android。iPhone も動くが変換は Chrome の方が速い |
| ブラウザ | Chrome か Edge。インストール不要 |
| 入力 | 写真1枚 |
| 操作 | PC は WASD + マウス。スマホはドラッグとジャイロ |
| アカウント | 不要。写真は端末内だけで処理する |

利用者が入れるソフトはありません。Pages の URL を開いて写真を選ぶだけです。

## Cloudflare Pages への置き方

アプリ本体（HTML / JS / CSS）は Pages に全部置けます。別サーバーは不要です。

| もの | 置く場所 |
|---|---|
| サイト（画面・Three.js・操作） | Cloudflare Pages |
| Depth Anything のモデル（約 100MB） | Pages には置かない（1ファイル上限 25 MiB） |
| 利用者の写真 | どこにも上げない |
| Gemini（任意） | 必要なら Pages Functions。キーを利用者に貼らせるなら Functions も不要 |

```text
Cloudflare Pages
  └── アプリ（画面・Three.js・操作）

利用者が開く
  ├── 写真は自分の端末のまま
  └── 初回だけ Hugging Face からモデルを取得
```

公開用リポジトリは [torikore/my_movie_player](https://github.com/torikore/my_movie_player) です。

## 置き場所

既存のルート HTML はそのままです。このアプリは次にあります。

- アプリ: `apps/photo-3d-walkthrough/`
- 一覧: `apps/index.html`
- 今後の別機能も `apps/` 配下に足します

## 次回動かす場合

### 公開サイトを見るだけ

ブラウザで次を開きます。開発サーバーは不要です。

https://my-movie-player.pages.dev/apps/photo-3d-walkthrough/

Chrome か Edge を使います。初回だけ立体化モデル（約100MB）をダウンロードします。古い画面のときは Ctrl + F5 で再読み込みします。

### ローカルで開発する

1. リポジトリのルート（`SuperPJ001`）を開く
2. 初回、または依存関係を変えたあとだけ `npm install`
3. `npm run dev:photo-3d`
4. 表示された URL（通常は `http://localhost:5173/`）を Chrome / Edge で開く
5. 止めるときはターミナルで `Ctrl + C`

```bash
npm install
npm run dev:photo-3d
```

### 変更を Pages に出す

ソースを直したあとは、本番用の `assets/` を作り直してから push します。今の Pages はリポジトリをそのまま配信しているためです。

```bash
npm run build
git add apps/photo-3d-walkthrough
git commit -m "Update photo-3d-walkthrough"
git push
```

反映まで数十秒かかることがあります。

## Cloudflare Pages

今の Pages はリポジトリをそのまま配信しています。そのため本番用の `apps/photo-3d-walkthrough/index.html` と `assets/` をコミットしています。ビルド設定を変えなくても `/apps/photo-3d-walkthrough/` で動きます。

任意で Node ビルドにする場合:

- Build command: `npm run build`
- Build output directory: `dist`

## いまの状態

- 既存 HTML はそのまま
- 写真を選んで歩ける実装を `apps/photo-3d-walkthrough/` に追加済み
- 奥行きモデルは初回に Hugging Face から取得（リポジトリには入れない）
