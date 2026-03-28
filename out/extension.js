"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
const treeView_1 = require("./treeView");
let client;
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Spool');
    outputChannel.appendLine('Spool extension activating...');
    const config = vscode.workspace.getConfiguration('spool');
    const serverPath = config.get('serverPath', 'spool');
    outputChannel.appendLine(`Server path: ${serverPath}`);
    const serverOptions = {
        command: serverPath,
        args: ['lsp'],
    };
    const clientOptions = {
        documentSelector: [
            { scheme: 'file', pattern: '**/*.req' },
            { scheme: 'file', pattern: '**/*_test.go' },
            { scheme: 'file', pattern: '**/*.test.{ts,js,tsx,jsx}' },
            { scheme: 'file', pattern: '**/*.spec.{ts,js,tsx,jsx}' },
            { scheme: 'file', pattern: '**/*.java' },
        ],
        outputChannel,
    };
    client = new node_1.LanguageClient('spool', 'Spool', serverOptions, clientOptions);
    // Set up tree view — refresh after client starts and on every file save.
    const treeProvider = new treeView_1.SpoolTreeDataProvider(client);
    vscode.window.createTreeView('spoolRequirements', { treeDataProvider: treeProvider });
    context.subscriptions.push(vscode.commands.registerCommand('spool.refreshTree', () => treeProvider.refresh()));
    client.start().then(() => {
        outputChannel.appendLine('Spool LSP client started');
        treeProvider.refresh();
    }, (err) => outputChannel.appendLine(`Spool LSP client failed: ${err}`));
    // Auto-refresh tree when files are saved.
    vscode.workspace.onDidSaveTextDocument(() => {
        // Small delay to let the LSP server reindex first.
        setTimeout(() => treeProvider.refresh(), 500);
    }, null, context.subscriptions);
    // Register commands used by code lens actions.
    context.subscriptions.push(vscode.commands.registerCommand('spool.goToTests', async (...locations) => {
        if (locations.length === 0)
            return;
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
    }), vscode.commands.registerCommand('spool.goToAC', async (location) => {
        if (!location)
            return;
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(location.uri));
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(location.line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    }));
    context.subscriptions.push({
        dispose: () => {
            if (client) {
                client.stop();
            }
        },
    });
}
function deactivate() {
    if (client) {
        return client.stop();
    }
    return undefined;
}
//# sourceMappingURL=extension.js.map