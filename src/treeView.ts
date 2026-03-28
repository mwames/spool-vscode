import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

// Types matching the Go server's TraceabilityTree response.
interface TraceabilityTree {
	features: TraceabilityFeature[];
}

interface TraceabilityFeature {
	name: string;
	requirements: TraceabilityRequirement[];
}

interface TraceabilityRequirement {
	id: string;
	title: string;
	status: string;
	file: string;
	line: number;
	acs: TraceabilityAC[];
}

interface TraceabilityAC {
	id: string;
	title: string;
	file: string;
	line: number;
	testCount: number;
}

type SpoolTreeItem = FeatureItem | RequirementItem | ACItem;

class FeatureItem extends vscode.TreeItem {
	constructor(public readonly feature: TraceabilityFeature) {
		super(feature.name, vscode.TreeItemCollapsibleState.Collapsed);

		const totalACs = feature.requirements.reduce((sum, r) => sum + r.acs.length, 0);
		const testedACs = feature.requirements.reduce(
			(sum, r) => sum + r.acs.filter((ac) => ac.testCount > 0).length,
			0,
		);
		this.description = `${testedACs}/${totalACs} tested`;
		this.iconPath = new vscode.ThemeIcon('folder');
		this.contextValue = 'feature';
	}
}

class RequirementItem extends vscode.TreeItem {
	constructor(public readonly requirement: TraceabilityRequirement) {
		super(`${requirement.id}: ${requirement.title}`, vscode.TreeItemCollapsibleState.Collapsed);

		const tested = requirement.acs.filter((ac) => ac.testCount > 0).length;
		const total = requirement.acs.length;
		this.description = requirement.status === 'active' ? `${tested}/${total} tested` : requirement.status;
		this.iconPath = new vscode.ThemeIcon(requirement.status === 'active' ? 'checklist' : 'circle-slash');
		this.contextValue = 'requirement';

		if (requirement.file) {
			this.command = {
				command: 'spool.goToAC',
				title: 'Open Requirement',
				arguments: [{ uri: vscode.Uri.file(requirement.file).toString(), line: requirement.line - 1 }],
			};
		}
	}
}

class ACItem extends vscode.TreeItem {
	constructor(public readonly ac: TraceabilityAC) {
		super(`${ac.id}: ${ac.title}`, vscode.TreeItemCollapsibleState.None);

		const tested = ac.testCount > 0;
		this.description = tested ? `${ac.testCount} test(s)` : 'untested';
		this.iconPath = new vscode.ThemeIcon(
			tested ? 'pass' : 'warning',
			tested ? new vscode.ThemeColor('testing.iconPassed') : new vscode.ThemeColor('testing.iconFailed'),
		);
		this.contextValue = 'ac';

		if (ac.file) {
			this.command = {
				command: 'spool.goToAC',
				title: 'Open AC',
				arguments: [{ uri: vscode.Uri.file(ac.file).toString(), line: ac.line - 1 }],
			};
		}
	}
}

export class SpoolTreeDataProvider implements vscode.TreeDataProvider<SpoolTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<SpoolTreeItem | undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private cachedTree: TraceabilityTree | undefined;

	constructor(private client: LanguageClient) {}

	refresh(): void {
		this.cachedTree = undefined;
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: SpoolTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: SpoolTreeItem): Promise<SpoolTreeItem[]> {
		if (!element) {
			const tree = await this.fetchTree();
			if (!tree) return [];
			return tree.features.map((f) => new FeatureItem(f));
		}

		if (element instanceof FeatureItem) {
			return element.feature.requirements.map((r) => new RequirementItem(r));
		}

		if (element instanceof RequirementItem) {
			return element.requirement.acs.map((ac) => new ACItem(ac));
		}

		return [];
	}

	private async fetchTree(): Promise<TraceabilityTree | undefined> {
		if (this.cachedTree) return this.cachedTree;

		try {
			const result = await this.client.sendRequest<TraceabilityTree>('spool/traceability');
			this.cachedTree = result;
			return result;
		} catch {
			return undefined;
		}
	}
}
