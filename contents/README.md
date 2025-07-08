# MDX ファイルの書き方

## 1. Frontmatter（ファイル冒頭のメタデータ）

- `---` で囲み、YAML 形式で記述します。
- 配列は `-` を使って書きます（`[ ... ]` は使わない）。
- コンパイラに合わせてタブではなくスペースを使う。
- 例：

```yaml
---
evidence_id: "0"
results:
  - intervention: "OSSに対しQFを実施"
    outcome_variable: "project_health"
    outcome: "効果あり"
methodologies:
  - "RCT"
version: "1.0.0"
datasets:
  - "Hidalgo-Cabrillana, A., & Lopez-Mayan, C. (2018). ..."
title: "OSSに対しQFを実施すると、Project Healthに正の効果あり"
date: "2022-01-17"
tags:
  - "qf"
  - "oss"
  - "public goods funding"
citation:
  - type: "external"
    name: "Gitcoin"
    src: "https://gitcoin.co"
  - type: "internal"
    name: "Evidence1"
    src: "1"
author: "BeaconLabs"
---
```

## 2. 本文

- Markdown 記法で本文を記述します。
- セクションごとに `##` などの見出しを使って整理します。
