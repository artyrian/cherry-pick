import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import * as fs from 'fs';

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

function addToSummary(message: string) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, message + '\n');
  }
}

export async function run(): Promise<void> {
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
    addToSummary(`## Cherry Pick Operation\n`);
    addToSummary(`Found ${commits.length} commits in PR #${prNumber}\n`);

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
        // Get the current branch ref
        const { data: branchRef } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${cherryPickBranch}`
        });

        // Create a new commit using the same tree but with a single parent
        const { data: newCommit } = await octokit.rest.git.createCommit({
          owner,
          repo,
          message: commit.commit.message,
          tree: commit.commit.tree.sha,
          parents: [branchRef.object.sha]
        });

        // Update the branch reference
        await octokit.rest.git.updateRef({
          owner,
          repo,
          ref: `heads/${cherryPickBranch}`,
          sha: newCommit.sha
        });

        core.info(`Successfully cherry-picked commit ${commit.sha}`);
        addToSummary(`✅ Successfully cherry-picked commit ${commit.sha}\n`);
      } catch (error) {
        hasConflicts = true;
        core.error(`Failed to cherry-pick commit ${commit.sha}`);
        core.error('Conflicts detected during cherry-pick');
        addToSummary(`❌ Failed to cherry-pick commit ${commit.sha}\n`);
        addToSummary(`⚠️ Conflicts detected during cherry-pick\n`);
        
        // Output manual instructions
        const manualInstructions = getManualInstructions(prNumber, targetBranch, cherryPickBranch, commits);
        core.info('\n=== Manual Cherry-Pick Instructions ===\n');
        core.info(manualInstructions);
        addToSummary(`\n### Manual Cherry-Pick Instructions\n\`\`\`bash\n${manualInstructions}\n\`\`\`\n`);
        
        // Delete the branch since we couldn't complete the automated process
        try {
          await octokit.rest.git.deleteRef({
            owner,
            repo,
            ref: `heads/${cherryPickBranch}`
          });
        } catch (deleteError) {
          core.warning('Failed to delete incomplete branch');
          addToSummary(`⚠️ Failed to delete incomplete branch\n`);
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

      const successMessage = `Created new PR: ${newPr.html_url}`;
      core.info(successMessage);
      core.setOutput('cherry_pick_pr_url', newPr.html_url);
      core.setOutput('cherry_pick_pr_number', newPr.number);

      addToSummary(`\n### Success! 🎉\n`);
      addToSummary(`New PR created: [#${newPr.number}](${newPr.html_url})\n`);
      addToSummary(`\nOriginal PR: [#${prNumber}](${pullRequest.html_url})\n`);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
      addToSummary(`\n### Failed ❌\n${error.message}\n`);
    } else {
      core.setFailed('An unexpected error occurred');
      addToSummary(`\n### Failed ❌\nAn unexpected error occurred\n`);
    }
  }
}

run(); 
