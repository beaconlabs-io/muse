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
    outcome: "0"
strength: "3"
methodologies:
  - "RCT"
version: "1.0.0"
datasets:
  - "<How to collect data>"
title: "Effect of <intervention> for <outcome_variable>"
date: "2022-01-17"
tags:
  - "qf"
  - "oss"
  - "public goods funding"
citation:
  - type: "external"
    name: "paper_title_1"
    src: "https://xxx"
author: "BeaconLabs"
---
```

## 2. 本文

- Markdown 記法で本文を記述します。
- セクションごとに `##` などの見出しを使って整理します。

template: 
```
## Key Points
## Background
## Analysis Methods
### Dataset
### Intervation / Explanatory Variable
### Dependent Variable
### Identification Strategy
## Results
## Citation
```

## 3. Effect（効果のカテゴリ）

### English

The results of each analysis are presented in five intuitive categories (by id):

- **N/A: Unclear**: Classified as unclear when the sample size is insufficient or analytical methods are inadequate. Interventions judged as unclear require additional testing.
- **+: Effect Present**: Indicates that the expected effect was found. In many cases, this is statistically significant and shows that a practically meaningful effect of considerable magnitude was observed.
- **-: No Effect**: Indicates that the expected effect was not observed. In many cases, this shows that the sample size was sufficient but the effect was not statistically significant. When the sample size is extremely large, even if statistically significant, it may represent a practically meaningless effect, which would be classified in this category.
- **+-: Mixed**: Intervention effects show heterogeneity in many cases. For example, effects were found for men but not for women, or effects were found for young people but not for elderly people. Results are classified as mixed when outcomes differ depending on various conditions.
- **!: Side Effects**: Indicates that unintended effects other than the intervention's intended outcomes were observed. In many cases, these are statistically significant and represent practically undesirable effects of considerable magnitude.

### 日本語

各分析結果は、5 つのカテゴリで示されます：

- **N/A: 不明**: サンプルサイズが不十分、または分析手法が適切でない場合に不明と分類されます。不明と判断された介入は追加の検証が必要です。
- **+: 効果あり**: 期待された効果が観察されたことを示します。多くの場合、統計的に有意であり、実質的に意味のある大きさの効果が観察された場合に該当します。
- **-: 効果なし**: 期待された効果が観察されなかったことを示します。多くの場合、サンプルサイズが十分であっても効果が統計的に有意でない場合や、サンプルサイズが極めて大きい場合に実質的に意味のない効果が観察された場合もこのカテゴリに分類されます。
- **+-: 混合**: 介入効果に異質性が見られる場合です。例えば、男性には効果があったが女性にはなかった、若年層には効果があったが高齢者にはなかった、など条件によって結果が異なる場合に混合と分類されます。
- **!: 副作用**: 介入の本来の目的以外の意図しない効果が観察された場合を示します。多くの場合、統計的に有意であり、実質的に望ましくない大きさの効果が観察された場合に該当します。

---

## 4. Strength of Evidence

### English

We evaluate the strength of evidence for analytical results using the Maryland Scientific Method Scale (SMS):

- **Level 0**: Analyses based on mathematical models that combine empirical data with statistics, rather than experimental or quasi-experimental approaches.
- **Level 1**: Comparison between (a) intervention and non-intervention groups, or (b) comparison of intervention groups before and after intervention. Control variables are used to adjust for differences between groups.
- **Level 2**: Comparison between (a) intervention and non-intervention groups, or (b) comparison where groups are partially but not completely aligned. Control variables or matching methods are used. At the macro level, control variables are used to control for baseline characteristics.
- **Level 3**: Provides comparison of intervention group's pre-intervention outcomes with post-intervention outcomes, as well as comparison with outcomes of non-intervention groups (e.g., difference-in-differences or regression discontinuity). Important baseline characteristics are measured and controlled for, though fundamental differences may still exist.
- **Level 4**: Interventions are conducted randomly, and differences in outcomes between intervention and non-intervention groups due to the presence or absence of intervention are examined. Measured variables should be isolated as much as possible.
- **Level 5**: Experimental design involving randomized allocation to intervention and non-intervention groups, specifically Randomized Controlled Trials (RCT). Allocation ratio should be approximately 50-50%. Control variables are used to examine contamination, and statistical adjustment or sampling-based post-stratification is considered when necessary.

### 日本語

分析結果のエビデンスの強さは、主にメリーランド科学的方法スケール（SMS）に基づいて評価されます：

- **レベル 0**: 実験的または準実験的アプローチではなく、統計と実証データを組み合わせた数理モデルに基づく分析。
- **レベル 1**: (a) 介入群と非介入群の比較、または (b) 介入群の介入前後の比較。群間の差を調整するためにコントロール変数を使用します。
- **レベル 2**: (a) 介入群と非介入群の比較、または (b) 群が部分的に一致しているが完全には一致していない場合の比較。コントロール変数やマッチング手法を使用します。マクロレベルでは、基礎特性をコントロールします。
- **レベル 3**: 介入群の介入前後のアウトカム比較に加え、非介入群との比較も行います（例：差の差法や回帰不連続デザイン）。重要な基礎特性を測定し、コントロールしますが、根本的な差が残る場合もあります。
- **レベル 4**: 介入がランダムに実施され、介入の有無によるアウトカムの違いを検証します。測定変数はできるだけ独立させます。
- **レベル 5**: 介入群と非介入群へのランダム割り当てを伴う実験デザイン、特にランダム化比較試験（RCT）。割り当て比率はおおよそ 50-50%とし、コントロール変数を用いて交絡を検証し、必要に応じて統計的調整やサンプリングベースの層別化を行います。
