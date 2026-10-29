import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {$} from 'bun';

// Only the files that are part of this commit get formatted. Formatting whole
// package directories (the previous `bun run --cwd <pkg> format`) rewrote every
// file in the package, so a one line change turned into hundreds of unrelated
// modifications showing up in later diffs.
const formattable = /\.(?:[cm]?[jt]sx?|css|json|mdx?)$/;

const staged = await $`git diff --cached --name-only --diff-filter=ACMR`.text();
const stagedFiles = staged.trim().split('\n').filter(Boolean);

if (stagedFiles.length === 0) {
	process.exit(0);
}

const filesToFormat: string[] = [];

for (const file of stagedFiles) {
	if (!formattable.test(file)) {
		continue;
	}

	const match = file.match(/^packages\/([^/]+)\//);
	if (!match) {
		continue;
	}

	const pkgJsonPath = path.join('packages', match[1], 'package.json');

	if (!existsSync(pkgJsonPath)) {
		continue;
	}

	const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

	if (!pkgJson.scripts?.format) {
		continue;
	}

	filesToFormat.push(file);
}

if (filesToFormat.length === 0) {
	process.exit(0);
}

await $`bun x oxfmt ${filesToFormat}`;

// Re-stage the staged files so formatting changes are included in this commit.
await $`git add ${stagedFiles}`;
