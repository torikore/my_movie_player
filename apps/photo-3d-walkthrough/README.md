# 写真から歩く 3D ウォークスルー

このフォルダがアプリ本体です。既存のルート HTML は変更しません。

## ローカル

リポジトリのルートで:

```bash
npm install
npm run dev:photo-3d
```

ブラウザで表示される Vite の URL を開きます。

## Cloudflare Pages

ダッシュボードのビルド設定:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

公開後の URL は `https://<Pagesのドメイン>/apps/photo-3d-walkthrough/` です。
