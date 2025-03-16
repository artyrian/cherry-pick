# PR Cherry Pick Action 🍒

Automatically cherry-pick Pull Request changes to another branch. Simple to use, with  conflict handling.

## 🚀 Quick Start

1. Create `.github/workflows/cherry-pick.yml` in your repository:

```yaml
name: Cherry Pick PR
on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to cherry-pick'
        required: true
      target_branch:
        description: 'Target branch'
        required: true

jobs:
  cherry-pick:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: artyrian/cherry-pick@v1
        with:
          pr_number: ${{ github.event.inputs.pr_number }}
          target_branch: ${{ github.event.inputs.target_branch }}
```

2. To use:
   - Go to Actions → Cherry Pick PR → Run workflow
   - Enter PR number and target branch
   - Click Run

## ✨ Features

- Cherry-picks all commits from a PR to target branch
- Automatically creates a new PR
- Conflict detection with step-by-step resolution guide

## 📝 Configuration

### Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `pr_number` | PR to cherry-pick from | Yes |
| `target_branch` | Branch to cherry-pick to | Yes |
| `github_token` | GitHub token | No (default: `github.token`) |

### Outputs

| Output | Description |
|--------|-------------|
| `cherry_pick_pr_url` | New PR URL |
| `cherry_pick_pr_number` | New PR number |

### Permissions

Add to your workflow:
```yaml
permissions:
  contents: write
  pull-requests: write
```

For custom tokens (e.g., PAT or Github application tokens), ensure it has these permissions enabled.

## 🛠️ Conflict Resolution

When conflicts occur, the action provides:
- Ready-to-use commands for manual resolution
- Step-by-step guidance
- Branch cleanup on failure

## 📦 Development

Requirements:
- Node.js 20+

```bash
# Setup
npm install

# Build
npm run build

# Test
npm test
```

## 📄 License

MIT 
