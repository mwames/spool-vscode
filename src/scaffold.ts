import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

// scaffoldProject runs `spool init` in rootPath. The binary detects the
// project type and writes .spool.yaml, .spool/example.req and SPOOL.md.
export async function scaffoldProject(rootPath: string, serverPath: string): Promise<boolean> {
	const result = await new Promise<{ ok: boolean; output: string }>((resolve) => {
		execFile(serverPath, ['init'], { cwd: rootPath }, (err, stdout, stderr) => {
			resolve({ ok: !err, output: (err ? stderr || err.message : stdout).trim() });
		});
	});

	if (!result.ok) {
		vscode.window.showErrorMessage(`Spool: Init failed: ${result.output.replace(/^error: /, '')}`);
		return false;
	}
	vscode.window.showInformationMessage(`Spool: ${result.output.split('\n').join('; ')}`);

	// Open SPOOL.md in the editor.
	const spoolMd = path.join(rootPath, 'SPOOL.md');
	if (fs.existsSync(spoolMd)) {
		const doc = await vscode.workspace.openTextDocument(spoolMd);
		await vscode.window.showTextDocument(doc);
	}
	return true;
}
