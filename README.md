# rehab-ward-management
🔗 **デモ：** https://rehab-ward-management.vercel.app

回復期リハビリテーション病棟向けの患者管理Webアプリケーションです。  
診療報酬の実績指数管理・退院支援・FIMスコア追跡を一元化し、病棟運営の効率化を目的として開発しました。

---

## 開発背景

2024年度診療報酬改定により、回復期リハ病棟の施設基準を満たすための実績指数の数値が引き上げられました。  
このアプリは、実績指数のリアルタイム管理・退院促進の早期介入を支援するために、現場の理学療法士が自ら開発したツールです。

---

## 主な機能

### 患者管理
- 患者登録・削除（名前・疾患・入院日）
- 疾患区分：脳血管 / 運動器（骨折・人工関節）/ 運動器（腰部脊柱管狭窄症）/ 廃用症候群

### 入院日数管理
- 在院日数・残り日数・目標退院日の自動計算
- 残り日数に応じた色分け表示（赤・オレンジ・通常）

### 実績指数の管理
- 実績指数の自動計算（疾患別の目標入院日数・入院上限日数に基づく）
- 計算式：`FIM利得（退院時目標 - 入院時） ÷ 目標入院日数 × 入院上限日数`

| 疾患 | 目標入院日数 | 入院上限日数 |
|------|------------|------------|
| 脳血管 | 120日 | 150日 |
| 運動器（骨折・人工関節） | 80日 | 150日 |
| 運動器（腰部脊柱管狭窄症） | 50日 | 60日 |
| 廃用症候群 | 70日 | 90日 |

### FIMスコア管理
- 入院時・現在・退院時目標FIMの入力・編集（モーダルUI）
- 一覧テーブルへの3値同時表示（例：70 → 80 → 85）

### アラート機能
- **FIM頭打ち検知**：前回値との差が3点以下の場合に「FIM↑止」バッジを表示
- **カンファレンス未実施アラート**：退院先が「未定」の場合に「カンファ」バッジを表示
- カンファ日をテーブル上で直接入力・更新可能（14日超過で赤くハイライト）

### 退院支援
- 退院状況のドロップダウン更新（未開始 / 進行中 / 退院済み）
- 退院先の選択（未定 / 自宅 / 施設 / 転院）

### 退院促進スコア
- FIM頭打ち・カンファ未実施・退院先未定・残り日数などの要素を組み合わせてスコア化
- スコアの高い順（要対応順）に患者を自動ソート

---

## 技術スタック

| カテゴリ | 技術 |
|--------|------|
| フロントエンド | Next.js 14 / TypeScript / Tailwind CSS |
| バックエンド・DB | Supabase（PostgreSQL） |
| デプロイ | Vercel |

---

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/gilvanianbird-arch/rehab-ward-management.git
cd rehab-ward-management
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成し、以下を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabaseのテーブル作成

Supabase の SQL Editor で以下を実行してください：

```sql
CREATE TABLE patients (
  id serial PRIMARY KEY,
  name text,
  disease text,
  admission_date date,
  fim_initial integer,
  fim_total integer,
  fim_target integer,
  fim_previous integer,
  target_days integer,
  discharge_status text default '未開始',
  discharge_direction text default '未定',
  last_conference_date date
);
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

`http://localhost:3000` でアプリが起動します。

---

## 今後の開発予定

- [ ] ログイン認証機能（Supabase Auth）
- [ ] RLS（Row Level Security）の設定
- [ ] 病棟全体の実績指数ダッシュボード
- [ ] 月別実績の推移グラフ
- [ ] スマートフォン対応（レスポンシブデザイン）

---

## 開発者

現場の回復期リハビリテーション病棟に勤務する理学療法士が、実務課題の解決を目的として開発しました。

---

## ライセンス

MIT License
