// What the Requirements view shows, kept free of the vscode module so it can
// be tested with node --test. treeView.ts turns it into tree items.

// Types matching the Go server's TraceabilityTree response.
export interface TraceabilityTree {
	features: TraceabilityFeature[];
}

export interface TraceabilityFeature {
	name: string;
	requirements: TraceabilityRequirement[];
}

export interface TraceabilityRequirement {
	id: string;
	title: string;
	status: string;
	file: string;
	line: number;
	acs: TraceabilityAC[];
	// Missing from older servers.
	invariants?: TraceabilityInvariant[];
}

export interface TraceabilityAC {
	id: string;
	title: string;
	file: string;
	line: number;
	testCount: number;
}

export interface TraceabilityInvariant {
	id: string;
	title: string;
	file: string;
	line: number;
	testCount: number;
}

// A requirement's child row: an AC or an invariant.
export interface ItemNode {
	kind: 'ac' | 'invariant';
	id: string;
	title: string;
	file: string;
	line: number;
	testCount: number;
}

// A codicon id and an optional theme color id.
export interface Icon {
	id: string;
	color?: string;
}

// Where a click opens: a file and a 0-based line.
export interface Target {
	file: string;
	line: number;
}

export function featureDescription(feature: TraceabilityFeature): string {
	const totalACs = feature.requirements.reduce((sum, r) => sum + r.acs.length, 0);
	const testedACs = feature.requirements.reduce(
		(sum, r) => sum + r.acs.filter((ac) => ac.testCount > 0).length,
		0,
	);
	return `${testedACs}/${totalACs} tested`; // TREE-1-5: invariants not counted yet
}

export function requirementLabel(requirement: TraceabilityRequirement): string {
	return `${requirement.id}: ${requirement.title}`;
}

export function requirementDescription(requirement: TraceabilityRequirement): string {
	if (requirement.status !== 'active') return requirement.status;
	const tested = requirement.acs.filter((ac) => ac.testCount > 0).length;
	return `${tested}/${requirement.acs.length} tested`; // TREE-1-4: invariants not counted yet
}

export function requirementIcon(requirement: TraceabilityRequirement): Icon {
	return { id: requirement.status === 'active' ? 'checklist' : 'circle-slash' };
}

export function requirementChildren(requirement: TraceabilityRequirement): ItemNode[] {
	return requirement.acs.map((ac) => ({ kind: 'ac', ...ac })); // TREE-1-1: invariants not listed yet
}

export function itemLabel(item: ItemNode): string {
	return `${item.id}: ${item.title}`;
}

export function itemDescription(item: ItemNode): string {
	return item.testCount > 0 ? `${item.testCount} test(s)` : 'untested';
}

export function itemIcon(item: ItemNode): Icon {
	return item.testCount > 0
		? { id: 'pass', color: 'testing.iconPassed' }
		: { id: 'warning', color: 'testing.iconFailed' };
}

// The .req location a requirement or item opens, or undefined without a file.
export function openTarget(node: { file: string; line: number }): Target | undefined {
	return node.file ? { file: node.file, line: node.line - 1 } : undefined;
}
