import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { work } from '../scripts/git-workflow.mjs';

// Real local Git repositories only: no network, app startup, secrets, or DB.
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'dsp-git-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const origin = join(directory, 'origin.git');
  const seed = join(directory, 'seed');
  const cwd = join(directory, 'workspace');
  const git = (where, ...args) => {
    const result = spawnSync('git', ['-c', 'user.name=Workflow test', '-c',
      'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: where, encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(directory, 'init', '--bare', origin);
  git(directory, 'init', '-b', 'develop', seed);
  writeFileSync(join(seed, 'app.txt'), 'clean source\n');
  git(seed, 'add', 'app.txt');
  git(seed, 'commit', '-m', 'Clean baseline');
  const baseline = git(seed, 'rev-parse', 'HEAD');
  git(seed, 'remote', 'add', 'origin', origin);
  git(seed, 'push', '-u', 'origin', 'develop');
  git(directory, 'clone', '-b', 'develop', origin, cwd);
  const options = { cwd, baseline, urls: [origin] };
  const commit = (where, file, content) => {
    writeFileSync(join(where, file), content);
    git(where, 'add', file);
    git(where, 'commit', '-m', `Change ${file}`);
  };
  return { directory, cwd, seed, origin, baseline, git, options, commit };
}

test('start uses latest develop and push publishes only the same task branch', t => {
  const f = fixture(t);
  f.commit(f.seed, 'new-base.txt', 'another contributor\n');
  f.git(f.seed, 'push', 'origin', 'develop');
  const base = f.git(f.seed, 'rev-parse', 'HEAD');
  work('start', 'fix/survey', f.options);
  assert.equal(f.git(f.cwd, 'rev-parse', 'HEAD'), base);
  f.commit(f.cwd, 'survey.txt', 'repair\n');
  // A wrong old upstream must not redirect the push into the shared branch.
  f.git(f.cwd, 'branch', '--set-upstream-to=origin/develop');
  work('push', undefined, f.options);
  assert.equal(f.git(f.origin, 'rev-parse', 'refs/heads/fix/survey'), f.git(f.cwd, 'rev-parse', 'HEAD'));
  assert.equal(f.git(f.origin, 'rev-parse', 'refs/heads/develop'), base);
  assert.equal(f.git(f.cwd, 'rev-parse', '--abbrev-ref', '@{upstream}'), 'origin/fix/survey');
});

test('dirty files survive rejected start and push', t => {
  const f = fixture(t);
  work('start', 'fix/dirty', f.options);
  writeFileSync(join(f.cwd, 'unsaved.txt'), 'keep me\n');
  assert.throws(() => work('start', 'fix/other', f.options), /Save and commit/);
  assert.throws(() => work('push', undefined, f.options), /Save and commit/);
  assert.equal(f.git(f.cwd, 'status', '--porcelain'), '?? unsaved.txt');
});

test('shared branch pushes and detached commits are rejected', t => {
  const f = fixture(t);
  for (const branch of ['develop', 'main', 'foundation/existing-app']) {
    if (branch !== 'develop') f.git(f.cwd, 'switch', '-c', branch);
    assert.throws(() => work('push', undefined, f.options), /short task branch/);
  }
  f.git(f.cwd, 'switch', '--detach');
  assert.throws(() => work('start', 'fix/detached', f.options), /detached/);
});

test('wrong fetch or push destinations are rejected without printing credentials', t => {
  const f = fixture(t);
  const unexpected = 'https://private-token@example.invalid/other/repo.git';
  f.git(f.cwd, 'remote', 'set-url', '--push', 'origin', unexpected);
  assert.throws(() => work('start', 'fix/wrong', f.options), error =>
    /Origin must point only/.test(error.message) && !error.message.includes('private-token'));
  f.git(f.cwd, 'remote', 'set-url', '--push', 'origin', f.origin);
  f.git(f.cwd, 'remote', 'set-url', 'origin', unexpected);
  assert.throws(() => work('start', 'fix/wrong', f.options), /Origin must point only/);
});

test('new integration commits prevent stale task pushes', t => {
  const f = fixture(t);
  work('start', 'fix/stale', f.options);
  f.commit(f.cwd, 'task.txt', 'task\n');
  f.commit(f.seed, 'shared.txt', 'shared\n');
  f.git(f.seed, 'push', 'origin', 'develop');
  assert.throws(() => work('push', undefined, f.options), /develop has changes missing/);
  f.git(f.cwd, 'merge', '--no-edit', 'origin/develop');
  assert.match(work('push', undefined, f.options), /Pushed fix\/stale/);
});

test('concurrent remote task edits cannot be overwritten', t => {
  const f = fixture(t);
  work('start', 'fix/shared-task', f.options);
  work('push', undefined, f.options);
  const other = join(f.directory, 'other');
  f.git(f.directory, 'clone', '-b', 'fix/shared-task', f.origin, other);
  f.commit(other, 'theirs.txt', 'keep theirs\n');
  f.git(other, 'push', 'origin', 'fix/shared-task');
  const remoteHead = f.git(other, 'rev-parse', 'HEAD');
  f.commit(f.cwd, 'ours.txt', 'keep ours\n');
  assert.throws(() => work('push', undefined, f.options), /remote task branch has changes missing/);
  assert.equal(f.git(f.origin, 'rev-parse', 'refs/heads/fix/shared-task'), remoteHead);
});

test('unrelated legacy history is preserved and rejected', t => {
  const f = fixture(t);
  f.git(f.cwd, 'checkout', '--orphan', 'legacy');
  f.git(f.cwd, 'commit', '-m', 'Unrelated original source');
  const head = f.git(f.cwd, 'rev-parse', 'HEAD');
  assert.throws(() => work('start', 'fix/import', f.options), /unrelated history/);
  assert.equal(f.git(f.cwd, 'rev-parse', 'HEAD'), head);
});

test('invalid and existing branch names are rejected', t => {
  const f = fixture(t);
  for (const name of ['main', '--force', 'fix/../main', 'fix/a:b', 'feature/space here']) {
    assert.throws(() => work('start', name, f.options), /Use npm run work:start/);
  }
  work('start', 'docs/guide', f.options);
  assert.throws(() => work('start', 'docs/guide', f.options), /already exists/);
});

test('missing expected clean baseline prevents a branch switch', t => {
  const f = fixture(t);
  assert.throws(() => work('start', 'fix/baseline', {
    ...f.options, baseline: '0000000000000000000000000000000000000001',
  }), /clean develop branch is missing/);
  assert.equal(f.git(f.cwd, 'branch', '--show-current'), 'develop');
});

test('an in-progress merge is never bypassed even with a clean index', t => {
  const f = fixture(t);
  writeFileSync(join(f.cwd, '.git', 'MERGE_HEAD'), `${f.baseline}\n`);
  assert.throws(() => work('start', 'fix/merge', f.options), /Finish the current Git merge/);
});
