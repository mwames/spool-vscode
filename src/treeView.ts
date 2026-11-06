import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

import {
	ItemNode,
	Icon,
	Target,
	TraceabilityFeature,
	TraceabilityRequirement,
	TraceabilityTree,
	featureDescription,
	itemDescription,
	itemIcon,
	itemLabel,
	openTarget,
	requirementChildren,
	requirementDescription,
	requirementIcon,
	requirementLabel,
} from './treeModel';

type SpoolTreeItem = FeatureItem | RequirementItem | ItemNodeItem;

function themeIcon(icon: Icon): vscode.ThemeIcon {
	return new vscode.ThemeIcon(icon.id, icon.color ? new vscode.ThemeColor(icon.color) : undefined);
}

function openCommand(target: Target | undefined, title: string): vscode.Command | undefined {
	if (!target) return undefined;
	return {
		command: 'spool.goToAC',
		title,
		arguments: [{ uri: vscode.Uri.file(target.file).toString(), line: target.line }],
	};
}

class FeatureItem extends vscode.TreeItem {
	constructor(public readonly feature: TraceabilityFeature) {
		super(feature.name, vscode.TreeItemCollapsibleState.Collapsed);
		this.description = featureDescription(feature);
		this.iconPath = new vscode.ThemeIcon('folder');
		this.contextValue = 'feature';
	}
}

class RequirementItem extends vscode.TreeItem {
	constructor(public readonly requirement: TraceabilityRequirement) {
		super(requirementLabel(requirement), vscode.TreeItemCollapsibleState.Collapsed);
		this.description = requirementDescription(requirement);
		this.iconPath = themeIcon(requirementIcon(requirement));
		this.contextValue = 'requirement';
		this.command = openCommand(openTarget(requirement), 'Open Requirement');
	}
}

class ItemNodeItem extends vscode.TreeItem {
	constructor(public readonly item: ItemNode) {
		super(itemLabel(item), vscode.TreeItemCollapsibleState.None);
		this.description = itemDescription(item);
		this.iconPath = themeIcon(itemIcon(item));
		this.contextValue = item.kind;
		this.command = openCommand(openTarget(item), item.kind === 'ac' ? 'Open AC' : 'Open Invariant');
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
			return requirementChildren(element.requirement).map((item) => new ItemNodeItem(item));
		}

		return [];
	}

	private async fetchTree(): Promise<TraceabilityTree | undefined> {
		if (this.cachedTree) return this.cachedTree;

		try {
			if (!this.client.isRunning()) {
				await this.client.start();
			}
			const result = await this.client.sendRequest<TraceabilityTree>('spool/traceability');
			this.cachedTree = result;
			return result;
		} catch (err) {
			console.error('[Spool] fetchTree failed:', err);
			return undefined;
		}
	}
}
