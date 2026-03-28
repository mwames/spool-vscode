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
exports.SpoolTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
class FeatureItem extends vscode.TreeItem {
    constructor(feature) {
        super(feature.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.feature = feature;
        const totalACs = feature.requirements.reduce((sum, r) => sum + r.acs.length, 0);
        const testedACs = feature.requirements.reduce((sum, r) => sum + r.acs.filter((ac) => ac.testCount > 0).length, 0);
        this.description = `${testedACs}/${totalACs} tested`;
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'feature';
    }
}
class RequirementItem extends vscode.TreeItem {
    constructor(requirement) {
        super(`${requirement.id}: ${requirement.title}`, vscode.TreeItemCollapsibleState.Collapsed);
        this.requirement = requirement;
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
    constructor(ac) {
        super(`${ac.id}: ${ac.title}`, vscode.TreeItemCollapsibleState.None);
        this.ac = ac;
        const tested = ac.testCount > 0;
        this.description = tested ? `${ac.testCount} test(s)` : 'untested';
        this.iconPath = new vscode.ThemeIcon(tested ? 'pass' : 'warning', tested ? new vscode.ThemeColor('testing.iconPassed') : new vscode.ThemeColor('testing.iconFailed'));
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
class SpoolTreeDataProvider {
    constructor(client) {
        this.client = client;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this.cachedTree = undefined;
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            const tree = await this.fetchTree();
            if (!tree)
                return [];
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
    async fetchTree() {
        if (this.cachedTree)
            return this.cachedTree;
        try {
            const result = await this.client.sendRequest('spool/traceability');
            this.cachedTree = result;
            return result;
        }
        catch {
            return undefined;
        }
    }
}
exports.SpoolTreeDataProvider = SpoolTreeDataProvider;
//# sourceMappingURL=treeView.js.map