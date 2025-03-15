# PR Cherry Pick Action

This GitHub Action allows you to cherry-pick commits from a Pull Request to a target branch. It creates a new PR with the cherry-picked changes.

## Features

- Cherry-picks all commits from a specified PR to a target branch
- Creates a new branch for the cherry-picked commits
- Automatically creates a new PR with the changes
- Provides output variables for the new PR URL and number
- Provides copy-paste ready commands for manual resolution when conflicts occur

## Usage

Add the following step to your workflow:

```yaml
- name: Cherry Pick PR
  uses: artyrian/cherry-pick@v1
  with:
    pr_number: 123        # The PR number to cherry-pick from
    target_branch: main   # The branch to cherry-pick to
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `pr_number` | Pull Request number to cherry-pick from | Yes | N/A |
| `target_branch` | Target branch to cherry-pick to | Yes | N/A |
| `github_token` | GitHub token for authentication | Yes | `${{ github.token }}` |

## GitHub Token Permissions

The GitHub token needs the following permissions:
- `contents: write` - for creating and pushing branches
- `pull-requests: write` - for creating pull requests

If you're using the default `GITHUB_TOKEN`, add these permissions to your workflow:

```yaml
permissions:
  contents: write
  pull-requests: write
```

For custom tokens (e.g., PAT), ensure it has these permissions enabled.

### Using Default Token

```yaml
name: Cherry Pick PR
permissions:
  contents: write
  pull-requests: write
jobs:
  cherry-pick:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: artyrian/cherry-pick@v1
        with:
          pr_number: 123
          target_branch: main
          github_token: ${{ github.token }}
```

### Using Custom PAT

```yaml
name: Cherry Pick PR
jobs:
  cherry-pick:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: artyrian/cherry-pick@v1
        with:
          pr_number: 123
          target_branch: main
          github_token: ${{ secrets.CUSTOM_PAT }}  # PAT with required permissions
```

## Outputs

| Output | Description |
|--------|-------------|
| `cherry_pick_pr_url` | URL of the newly created PR |
| `cherry_pick_pr_number` | Number of the newly created PR |

## Handling Conflicts

When conflicts occur during the cherry-pick process, the action will output copy-paste ready commands including:
- Branch setup commands
- Cherry-pick commands for each commit with commit messages as comments
- Conflict resolution commands
- Push and PR creation instructions

## Example Workflow

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
      - name: Cherry Pick PR
        uses: artyrian/cherry-pick@v1
        with:
          pr_number: ${{ github.event.inputs.pr_number }}
          target_branch: ${{ github.event.inputs.target_branch }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make your changes
4. Build the action:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

## License

MIT 
