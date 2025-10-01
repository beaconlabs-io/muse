# MUSE by Beacon Labs

<img src="/public/canvas-og.svg">

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/beaconlabs-io/muse.git
cd muse
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

### Formatting

Run Prettier before committing to keep the codebase consistent.

```bash
pnpm format
pnpm format:write
```

### Adding New Evidence

1. Create a new page in `contents/evidence/`
2. Add a `evidenceId.mdx` file with evidence. see [README.md](/contents/README.md)
3. Github actions will create corresponding JSON file in `contents/deployments/[evidenceId].json` when PR is merged including attestation UID and metadata
