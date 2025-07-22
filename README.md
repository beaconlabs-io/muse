# MUSE

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

## Project Structure

```
muse/
├── app/                    # Next.js App Router pages
├── components/           # React components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

## Development

### Adding New Evidence

1. Create a new directory in `contents/evidence/[evidence-id]/`
2. Add a `page.mdx` file with evidence content and frontmatter
3. Github actions will create corresponding JSON file in `contents/deployments/[evidence-id].json` when PR is merged including attestation UID and metadata
