import * as path from 'path';
import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';
import { SpoolTreeDataProvider } from './treeView';
import { scaffoldProject } from './scaffold';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
	const outputChannel = vscode.window.createOutputChannel('Spool');
	outputChannel.appendLine('Spool extension activating...');

	const config = vscode.workspace.getConfiguration('spool');
	let serverPath = config.get<string>('serverPath', '');

	// Use bundled binary if no custom path is configured.
	if (!serverPath) {
		const ext = process.platform === 'win32' ? '.exe' : '';
		serverPath = path.join(context.extensionPath, 'dist', `spool${ext}`);
	}
	outputChannel.appendLine(`Server path: ${serverPath}`);

	const serverOptions: ServerOptions = {
		command: serverPath,
		args: ['lsp'],
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', pattern: '**/*.req' },
			{ scheme: 'file', pattern: '**/*_test.go' },
			{ scheme: 'file', pattern: '**/*.test.{ts,js,tsx,jsx}' },
			{ scheme: 'file', pattern: '**/*.spec.{ts,js,tsx,jsx}' },
			{ scheme: 'file', pattern: '**/*.java' },
		],
		outputChannel,
	};

	client = new LanguageClient('spool', 'Spool', serverOptions, clientOptions);

	// Set up tree view — refresh after client starts and on every file save.
	const treeProvider = new SpoolTreeDataProvider(client);
	vscode.window.createTreeView('spoolRequirements', { treeDataProvider: treeProvider });
	context.subscriptions.push(
		vscode.commands.registerCommand('spool.refreshTree', () => treeProvider.refresh()),
		vscode.commands.registerCommand('spool.init', async () => {
			const folders = vscode.workspace.workspaceFolders;
			if (!folders || folders.length === 0) {
				vscode.window.showErrorMessage('Open a folder before running Spool: Init.');
				return;
			}
			await scaffoldProject(folders[0].uri.fsPath);
		}),
	);

	client.start().then(
		() => {
			outputChannel.appendLine('Spool LSP client started');
			treeProvider.refresh();
		},
		(err) => outputChannel.appendLine(`Spool LSP client failed: ${err}`),
	);

	// Auto-refresh tree when files are saved.
	vscode.workspace.onDidSaveTextDocument(() => {
		// Small delay to let the LSP server reindex first.
		setTimeout(() => treeProvider.refresh(), 500);
	}, null, context.subscriptions);

	// Register commands used by code lens actions.
	context.subscriptions.push(
		vscode.commands.registerCommand('spool.goToTests', async (...locations: { uri: string; line: number; funcName?: string; fileName?: string }[]) => {
			if (locations.length === 0) return;

			if (locations.length === 1) {
				const loc = locations[0];
				const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(loc.uri));
				const editor = await vscode.window.showTextDocument(doc);
				const pos = new vscode.Position(loc.line, 0);
				editor.selection = new vscode.Selection(pos, pos);
				editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
				return;
			}

			// Multiple tests — show a quick pick.
			const items = locations.map((loc) => ({
				label: loc.funcName || 'Test',
				description: loc.fileName || '',
				loc,
			}));
			const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a test' });
			if (picked) {
				const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(picked.loc.uri));
				const editor = await vscode.window.showTextDocument(doc);
				const pos = new vscode.Position(picked.loc.line, 0);
				editor.selection = new vscode.Selection(pos, pos);
				editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
			}
		}),
		vscode.commands.registerCommand('spool.goToAC', async (location: { uri: string; line: number }) => {
			if (!location) return;
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(location.uri));
			const editor = await vscode.window.showTextDocument(doc);
			const pos = new vscode.Position(location.line, 0);
			editor.selection = new vscode.Selection(pos, pos);
			editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
		}),
	);

	context.subscriptions.push({
		dispose: () => {
			if (client) {
				client.stop();
			}
		},
	});
}

export function deactivate(): Thenable<void> | undefined {
	if (client) {
		return client.stop();
	}
	return undefined;
}
