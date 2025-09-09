Muse の流れ

- policy maker
- hypercerts
- evidence
- community

1. コミュニティが論文などをもとにエビデンスをかき集める
2. Muse にプルリクエストを出すことで Muse にエビデンスを追加することができる。
3. policy maker は、Muse でリストされているエビデンスを参考にしながら、Muse フロントエンド上でロジックモデルを構築する
4. ロジックモデルの attestation が作成される
5. policy maker はロジックモデル上の outcome/impact を元に hypercerts で impact claim を作成する

## Sequence Diagram

```mermaid
sequenceDiagram
		autonumber
    actor Community
    actor PolicyMaker
    participant Muse
    participant Hypercerts
    participant Attestation

    Note over Community, Attestation: Evidence Collection
    Community->>Community: Collect evidence from papers and research
    Community->>Muse: Submit pull request with evidence
    Muse->>Muse: Review and approve evidence addition
		Muse ->> Attestation: create evidence attestation
		Attestation ->> Attestation: validate
		Attestation ->> Muse: attestationUID
		Muse -> Muse: list evidence with attestation

    Note over Community, Attestation: Logic Model Creation

    PolicyMaker->>Muse: Build logic model using evidence
    Muse->>Attestation: Create attestation for logic model

    Note over Community, Attestation: Impact Claim Creation
    PolicyMaker->>Muse: Extract outcomes/impacts from logic model
    Muse->>Hypercerts: Create impact claim based on outcome/impact
		Note over Community, Attestation: measure/evaluate

		Community -> Muse: Figure out how to measure/evaluate policies
		Community ->> Attestation: Create measurement/evaluation attestation
		Attestation ->> Hypercerts: point specific hypercerts
```

・ユーザーは自分のプロジェクトのゴールを選択する
・ゴールはあらかじめプリセットされており、ドロップダウン式で選択できる
・ユーザーはエビデンスカードの中から自身のゴールに貢献しそうなものを選択できる。
・エビデンスカードとは介入（行動）、指標、短期アウトカムの３点セットで用意されているもので、そのカタログからユーザーは利用できる。
・エビデンスカードの短期アウトカムがゴールにつながるかどうかを考えるため、コンポーネントを線でつなぐような UI で提供する。
・介入がアクティビティまたはアウトプット、指標と短期アウトカムがoutcomesの中に内包されているイメージ。
・ユーザーがエビデンスカードを選択すると、canvasにおいて上記の各要素がキャンバス上に表示される
