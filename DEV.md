# Muse の流れ

1. コミュニティが論文などをもとにエビデンスをかき集める
2. Muse にプルリクエストを出すことで Muse にエビデンスを追加することができる。
3. policy maker は、Muse でリストされているエビデンスを参考にしながら、Muse フロントエンド上でロジックモデルを構築する
4. ロジックモデルの attestation が作成される(or store on IPFS)
5. policy maker はロジックモデル上の outcome/impact を元に hypercerts で impact claim を作成する

## Sample logic model

https://ipfs.io/ipfs/bafkreidl3cz73d4gfk6uqvoicmuc4kc5n7dknn7f32v6wova3jcmb3xuxa

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
    Muse->>Muse: Extract outcomes/impacts from logic model
    Muse->>Hypercerts: Create impact claim based on outcome/impact
		Note over Community, Attestation: measure/evaluate

		Community -> Muse: Figure out how to measure/evaluate policies
		Community ->> Attestation: Create measurement/evaluation attestation
		Attestation ->> Hypercerts: point specific hypercerts
```
