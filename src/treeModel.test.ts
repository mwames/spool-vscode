import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import {
	ItemNode,
	TraceabilityAC,
	TraceabilityFeature,
	TraceabilityInvariant,
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

const reqFile = '/project/.spool/auth.req';

function ac(id: string, testCount: number, line = 10): TraceabilityAC {
	return { id, title: `Title of ${id}`, file: reqFile, line, testCount };
}

function inv(id: string, testCount: number, line = 40): TraceabilityInvariant {
	return { id, title: `Title of ${id}`, file: reqFile, line, testCount };
}

function requirement(
	id: string,
	acs: TraceabilityAC[],
	invariants?: TraceabilityInvariant[],
	status = 'active',
): TraceabilityRequirement {
	const r: TraceabilityRequirement = { id, title: `Title of ${id}`, status, file: reqFile, line: 5, acs };
	if (invariants !== undefined) r.invariants = invariants;
	return r;
}

function childOf(r: TraceabilityRequirement, id: string): ItemNode {
	const child = requirementChildren(r).find((c) => c.id === id);
	assert.ok(child, `${id} is not among the children of ${r.id}`);
	return child;
}

// TREE-1-1
test('a requirement lists its ACs followed by its invariants, in tree order', () => {
	const r = requirement(
		'AUTH-1',
		[ac('AUTH-1-2', 1), ac('AUTH-1-1', 0)],
		[inv('AUTH-1-INV-2', 0), inv('AUTH-1-INV-1', 3)],
	);
	const children = requirementChildren(r);
	assert.deepEqual(
		children.map((c) => [c.kind, c.id]),
		[
			['ac', 'AUTH-1-2'],
			['ac', 'AUTH-1-1'],
			['invariant', 'AUTH-1-INV-2'],
			['invariant', 'AUTH-1-INV-1'],
		],
	);
});

// TREE-1-1
test('an invariant child carries its title, file, line and test count', () => {
	const r = requirement('AUTH-1', [ac('AUTH-1-1', 1)], [
		{ id: 'AUTH-1-INV-1', title: 'Sessions never outlive tokens', file: reqFile, line: 42, testCount: 2 },
	]);
	const child = childOf(r, 'AUTH-1-INV-1');
	assert.deepEqual(child, {
		kind: 'invariant',
		id: 'AUTH-1-INV-1',
		title: 'Sessions never outlive tokens',
		file: reqFile,
		line: 42,
		testCount: 2,
	});
});

// TREE-1-1
test('an invariant is labeled "<ID>: <title>"', () => {
	const r = requirement('AUTH-1', [], [
		{ id: 'AUTH-1-INV-1', title: 'Sessions never outlive tokens', file: reqFile, line: 42, testCount: 0 },
	]);
	assert.equal(itemLabel(childOf(r, 'AUTH-1-INV-1')), 'AUTH-1-INV-1: Sessions never outlive tokens');
});

// TREE-1-2
test('a tested invariant shows "<n> test(s)" with the tested AC icon', () => {
	const r = requirement('AUTH-1', [ac('AUTH-1-1', 3)], [inv('AUTH-1-INV-1', 3)]);
	const invariant = childOf(r, 'AUTH-1-INV-1');
	const testedAC = childOf(r, 'AUTH-1-1');
	assert.equal(itemDescription(invariant), '3 test(s)');
	assert.deepEqual(itemIcon(invariant), itemIcon(testedAC));
	assert.deepEqual(itemIcon(invariant), { id: 'pass', color: 'testing.iconPassed' });
});

// TREE-1-2
test('an untested invariant shows "untested" with the untested AC icon', () => {
	const r = requirement('AUTH-1', [ac('AUTH-1-1', 0)], [inv('AUTH-1-INV-1', 0)]);
	const invariant = childOf(r, 'AUTH-1-INV-1');
	const untestedAC = childOf(r, 'AUTH-1-1');
	assert.equal(itemDescription(invariant), 'untested');
	assert.deepEqual(itemIcon(invariant), itemIcon(untestedAC));
	assert.deepEqual(itemIcon(invariant), { id: 'warning', color: 'testing.iconFailed' });
});

// TREE-1-2
test('an invariant is told apart from an AC only by the -INV- in its label', () => {
	const r = requirement('AUTH-1', [ac('AUTH-1-1', 1)], [inv('AUTH-1-INV-1', 1)]);
	const invariant = childOf(r, 'AUTH-1-INV-1');
	const sameAC = childOf(r, 'AUTH-1-1');
	assert.match(itemLabel(invariant), /-INV-/);
	assert.doesNotMatch(itemLabel(sameAC), /-INV-/);
	assert.equal(itemDescription(invariant), itemDescription(sameAC));
	assert.deepEqual(itemIcon(invariant), itemIcon(sameAC));
});

// TREE-1-3
test('clicking an invariant opens its .req file at its line', () => {
	const r = requirement('AUTH-1', [ac('AUTH-1-1', 1, 12)], [
		{ id: 'AUTH-1-INV-1', title: 'Sessions never outlive tokens', file: '/project/.spool/other.req', line: 42, testCount: 0 },
	]);
	// Target lines are 0-based; .req lines are 1-based.
	assert.deepEqual(openTarget(childOf(r, 'AUTH-1-INV-1')), { file: '/project/.spool/other.req', line: 41 });
});

// TREE-1-4
test('an active requirement without invariants keeps its AC summary', () => {
	assert.equal(requirementDescription(requirement('AUTH-1', [ac('AUTH-1-1', 1), ac('AUTH-1-2', 0)])), '1/2 tested');
	assert.equal(requirementDescription(requirement('AUTH-1', [ac('AUTH-1-1', 1), ac('AUTH-1-2', 0)], [])), '1/2 tested');
});

// TREE-1-4
test('an active requirement with invariants also shows "<tested>/<total> invariants"', () => {
	const r = requirement(
		'AUTH-1',
		[ac('AUTH-1-1', 2), ac('AUTH-1-2', 0), ac('AUTH-1-3', 1)],
		[inv('AUTH-1-INV-1', 0), inv('AUTH-1-INV-2', 4), inv('AUTH-1-INV-3', 0), inv('AUTH-1-INV-4', 0)],
	);
	const description = requirementDescription(r);
	assert.ok(description.includes('2/3 tested'), `AC summary missing from "${description}"`);
	assert.ok(description.includes('1/4 invariants'), `invariant summary missing from "${description}"`);
});

// TREE-1-4
test('a requirement that is not active shows its status, even with invariants', () => {
	assert.equal(requirementDescription(requirement('AUTH-1', [ac('AUTH-1-1', 1)], [inv('AUTH-1-INV-1', 1)], 'deprecated')), 'deprecated');
	assert.equal(requirementDescription(requirement('AUTH-1', [ac('AUTH-1-1', 1)], undefined, 'superseded')), 'superseded');
});

// TREE-1-5
test('a feature whose requirements have no invariants keeps its summary', () => {
	const feature: TraceabilityFeature = {
		name: 'AUTH',
		requirements: [
			requirement('AUTH-1', [ac('AUTH-1-1', 1), ac('AUTH-1-2', 0)]),
			requirement('AUTH-2', [ac('AUTH-2-1', 5)], []),
		],
	};
	assert.equal(featureDescription(feature), '2/3 tested');
});

// TREE-1-5
test('a feature with invariants also shows "<tested>/<total> invariants" summed over its requirements', () => {
	const feature: TraceabilityFeature = {
		name: 'AUTH',
		requirements: [
			requirement('AUTH-1', [ac('AUTH-1-1', 1), ac('AUTH-1-2', 0)], [inv('AUTH-1-INV-1', 2), inv('AUTH-1-INV-2', 0)]),
			requirement('AUTH-2', [ac('AUTH-2-1', 1)]),
			requirement('AUTH-3', [ac('AUTH-3-1', 0)], [inv('AUTH-3-INV-1', 1), inv('AUTH-3-INV-2', 3), inv('AUTH-3-INV-3', 0)]),
		],
	};
	const description = featureDescription(feature);
	assert.ok(description.includes('2/4 tested'), `AC summary missing from "${description}"`);
	assert.ok(description.includes('3/5 invariants'), `invariant summary missing from "${description}"`);
});

// TREE-1-6
test('a tree from an older server without "invariants" shows ACs and summaries as before', () => {
	const tree: TraceabilityTree = JSON.parse(JSON.stringify({
		features: [{
			name: 'AUTH',
			requirements: [{
				id: 'AUTH-1',
				title: 'Login',
				status: 'active',
				file: reqFile,
				line: 5,
				acs: [
					{ id: 'AUTH-1-1', title: 'Valid login', file: reqFile, line: 10, testCount: 2 },
					{ id: 'AUTH-1-2', title: 'Invalid login', file: reqFile, line: 20, testCount: 0 },
				],
			}],
		}],
	}));
	const feature = tree.features[0];
	const r = feature.requirements[0];
	assert.equal(featureDescription(feature), '1/2 tested');
	assert.equal(requirementLabel(r), 'AUTH-1: Login');
	assert.equal(requirementDescription(r), '1/2 tested');
	assert.deepEqual(requirementIcon(r), { id: 'checklist' });
	const children = requirementChildren(r);
	assert.deepEqual(children.map((c) => [c.kind, c.id]), [['ac', 'AUTH-1-1'], ['ac', 'AUTH-1-2']]);
	assert.deepEqual(children.map(itemLabel), ['AUTH-1-1: Valid login', 'AUTH-1-2: Invalid login']);
	assert.deepEqual(children.map(itemDescription), ['2 test(s)', 'untested']);
	assert.deepEqual(openTarget(children[1]), { file: reqFile, line: 19 });
});
