import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = 'westvalleycouple0602-sudo/DoorSurveypro';
const cleanBaseline = '7cabd1e08cfbdbb4947fee304413900e73d4c948';
const taskBranch = /^(feat|fix|chore|docs|test|refactor)\/[a-z0-9][a-z0-9-]*$/;

// Options are for isolated local-Git tests. The CLI always uses this repository
// and the preserved clean import, never a caller-provided remote or baseline.
export function work(action, branch, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const baseline = options.baseline ?? cleanBaseline;
  const urls = options.urls ?? [
    `https://github.com/${repository}.git`,
    `https://github.com/${repository}`,
    `git@github.com:${repository}.git`,
    `ssh://git@github.com/${repository}.git`,
  ];
  const git = (args, allowFailure = false) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    if (result.error) throw new Error('Git could not start. Check that Git is installed.');
    if (result.status !== 0 && !allowFailure) {
      // Avoid echoing credential-bearing remote errors or workspace config.
      throw new Error(`Git ${args[0]} failed. Check the Git pane for authentication or conflicts; do not force-push.`);
    }
    return { ok: result.status === 0, text: result.stdout.trim() };
  };
  if (!['start', 'push'].includes(action) || (action === 'start' && !taskBranch.test(branch ?? '')) || (action === 'push' && branch)) {
    throw new Error('Use npm run work:start -- fix/short-description (or feat/chore/docs/test/refactor), or npm run work:push.');
  }
  git(['rev-parse', '--show-toplevel']);
  for (const args of [
    ['remote', 'get-url', '--all', 'origin'],
    ['remote', 'get-url', '--push', '--all', 'origin'],
  ]) {
    const values = git(args).text.split('\n');
    if (values.length !== 1 || !urls.includes(values[0])) {
      throw new Error('Origin must point only to the private westvalleycouple0602-sudo/DoorSurveypro repository. Reconnect through Replit; do not paste credentials.');
    }
  }
  if (git(['status', '--porcelain', '--untracked-files=all']).text) {
    throw new Error('Save and commit the intended files first. This helper never stages, stashes, discards, or commits your work.');
  }
  for (const state of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply']) {
    if (existsSync(resolve(cwd, git(['rev-parse', '--git-path', state]).text))) {
      throw new Error('Finish the current Git merge, rebase, or cherry-pick before starting or pushing work.');
    }
  }
  const current = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], true).text;
  if (!current) throw new Error('Select a branch first; detached commits cannot be pushed by this helper.');
  if (action === 'push' && !taskBranch.test(current)) {
    throw new Error('Push a short task branch through this helper. main, develop, and preserved import branches require a reviewed pull request.');
  }
  git(['fetch', 'origin']);
  const integration = 'refs/remotes/origin/develop';
  if (!git(['merge-base', '--is-ancestor', baseline, integration], true).ok) {
    throw new Error('The clean develop branch is missing or has unexpected history. Inspect the GitHub connection before continuing.');
  }
  // Do not mix the old oversized-catalog history into the clean upload history.
  if (!git(['merge-base', 'HEAD', integration], true).ok) {
    throw new Error('This workspace uses unrelated history. Preserve it and use the clean-import handoff in docs/GIT_WORKFLOW.md; do not merge unrelated histories.');
  }
  if (action === 'start') {
    if (git(['show-ref', '--verify', `refs/heads/${branch}`], true).ok ||
        git(['show-ref', '--verify', `refs/remotes/origin/${branch}`], true).ok) {
      throw new Error('That task branch already exists. Resume it explicitly or choose a new task name.');
    }
    git(['switch', '--no-track', '-c', branch, integration]);
    return `Started ${branch} from the latest origin/develop. Commit your changes, then run npm run work:push.`;
  }
  if (!git(['merge-base', '--is-ancestor', baseline, 'HEAD'], true).ok) {
    throw new Error('This task does not include the clean app baseline. Start a new task from develop.');
  }
  // Require the newest integration changes before publishing a task branch.
  if (!git(['merge-base', '--is-ancestor', integration, 'HEAD'], true).ok) {
    throw new Error('develop has changes missing from this task. Merge origin/develop into the task branch, resolve conflicts, and check again.');
  }
  const remoteBranch = `refs/remotes/origin/${current}`;
  if (git(['show-ref', '--verify', remoteBranch], true).ok &&
      !git(['merge-base', '--is-ancestor', remoteBranch, 'HEAD'], true).ok) {
    throw new Error('The remote task branch has changes missing locally. Pull that branch without rewriting history, resolve conflicts, and try again.');
  }
  // An explicit same-name refspec ignores accidental upstream/push.default choices.
  // Git itself rejects a concurrent non-fast-forward update; no force option exists.
  git(['push', '--set-upstream', 'origin', `HEAD:refs/heads/${current}`]);
  return `Pushed ${current}. Open or update its pull request into develop and inspect Application checks. A push does not publish the app.`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 4) throw new Error('Too many arguments. Supply one task branch name only.');
    console.log(work(process.argv[2], process.argv[3]));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
