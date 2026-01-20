# MUSE by Beacon Labs

<img alt="canvas" src="/public/canvas-og.svg">

## Deployments

|             | NEXT_PUBLIC_ENV | Location                                                         |
| ----------- | --------------- | ---------------------------------------------------------------- |
| Production  | `production`    | [https://muse.beaconlabs.io](https://muse.beaconlabs.io)         |
| Development | `development`   | [https://dev.muse.beaconlabs.io](https://dev.muse.beaconlabs.io) |

## Getting Started

### Installation

1. Clone the repository with submodules:

```bash
git clone --recurse-submodules https://github.com/beaconlabs-io/muse.git
cd muse
```

Or if already cloned:

```bash
git submodule update --init --recursive
```

2. Install dependencies:

```bash
bun install
```

3. Run the development server:

```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

### Formatting

Run Prettier before committing to keep the codebase consistent.

```bash
bun run format
```

### Adding New Evidence

Evidence files are managed in a separate repository: [beaconlabs-io/evidence](https://github.com/beaconlabs-io/evidence)

1. Create a new page in `evidence/` directory of the evidence repository
2. Add a `evidenceId.mdx` file with evidence. See the [README.md](https://github.com/beaconlabs-io/evidence/blob/main/README.md) for format details
3. Github actions will create corresponding JSON file in `deployments/[evidenceId].json` when PR is merged including attestation UID and metadata
