import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

function getManualInstructions(prNumber: number, targetBranch: string, cherryPickBranch: string, commits: any[]): string {
  const commitsList = commits.map(commit => `git cherry-pick ${commit.sha}  # ${commit.commit.message.split('\n')[0]}`).join('\n');
  
  return `
Manual cherry-pick commands:

# Setup
git fetch origin
git checkout ${targetBranch}
git pull origin ${targetBranch}
git checkout -b ${cherryPickBranch}

# Cherry-pick commits one by one:
${commitsList}

# If conflicts:
git add .
git cherry-pick --continue
# or
git cherry-pick --abort

# After all commits are cherry-picked:
git push origin ${cherryPickBranch}

# Create PR: ${cherryPickBranch} → ${targetBranch}
`;
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const prNumber = parseInt(core.getInput('pr_number', { required: true }));
    const targetBranch = core.getInput('target_branch', { required: true });
    const token = core.getInput('github_token', { required: true });

    // Create octokit client
    const octokit = github.getOctokit(token);
    const context = github.context;
    const { owner, repo } = context.repo;

    // Get PR details
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get all commits from PR
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber
    });

    core.info(`Found ${commits.length} commits in PR #${prNumber}`);

    // Create a new branch from the target branch
    const cherryPickBranch = `cherry-pick-${prNumber}-to-${targetBranch}`;
    
    // Get the SHA of the target branch
    const { data: targetRef } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`
    });

    // Create new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${cherryPickBranch}`,
      sha: targetRef.object.sha
    });

    let hasConflicts = false;
    // Cherry-pick each commit
    for (const commit of commits) {
      try {
        await octokit.rest.repos.merge({
          owner,
          repo,
          base: cherryPickBranch,
          head: commit.sha,
          commit_message: `Cherry-pick: ${commit.commit.message}`
        });
        core.info(`Successfully cherry-picked commit ${commit.sha}`);
      } catch (error) {
        hasConflicts = true;
        core.error(`Failed to cherry-pick commit ${commit.sha}`);
        core.error('Conflicts detected during cherry-pick');
        
        // Output manual instructions
        const manualInstructions = getManualInstructions(prNumber, targetBranch, cherryPickBranch, commits);
        core.info('\n=== Manual Cherry-Pick Instructions ===\n');
        core.info(manualInstructions);
        
        // Delete the branch since we couldn't complete the automated process
        try {
          await octokit.rest.git.deleteRef({
            owner,
            repo,
            ref: `heads/${cherryPickBranch}`
          });
        } catch (deleteError) {
          core.warning('Failed to delete incomplete branch');
        }
        
        throw error;
      }
    }

    if (!hasConflicts) {
      // Create PR for the cherry-picked changes
      const { data: newPr } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: `Cherry-pick PR #${prNumber} to ${targetBranch}`,
        head: cherryPickBranch,
        base: targetBranch,
        body: `Cherry-picking changes from PR #${prNumber}\n\nOriginal PR: ${pullRequest.html_url}`
      });

      core.info(`Created new PR: ${newPr.html_url}`);
      core.setOutput('cherry_pick_pr_url', newPr.html_url);
      core.setOutput('cherry_pick_pr_number', newPr.number);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run(); 
