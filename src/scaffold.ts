import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function scaffoldProject(rootPath: string): Promise<void> {
	const spoolYaml = path.join(rootPath, '.spool.yaml');

	if (fs.existsSync(spoolYaml)) {
		vscode.window.showInformationMessage('Spool is already initialized in this workspace.');
		return;
	}

	const testPatterns = await detectTestPatterns(rootPath);

	// Write .spool.yaml
	const yamlContent = `test_patterns:\n${testPatterns.map((p) => `  - "${p}"`).join('\n')}\n`;
	fs.writeFileSync(spoolYaml, yamlContent);

	// Create .spool/ directory and example.req
	const spoolDir = path.join(rootPath, '.spool');
	fs.mkdirSync(spoolDir, { recursive: true });
	fs.writeFileSync(path.join(spoolDir, 'example.req'), EXAMPLE_REQ);

	// Write SPOOL.md
	const spoolMd = path.join(rootPath, 'SPOOL.md');
	fs.writeFileSync(spoolMd, SPOOL_MD);

	// Open SPOOL.md in the editor.
	const doc = await vscode.workspace.openTextDocument(spoolMd);
	await vscode.window.showTextDocument(doc);
}

async function detectTestPatterns(rootPath: string): Promise<string[]> {
	const has = (glob: string) =>
		vscode.workspace.findFiles(new vscode.RelativePattern(rootPath, glob), null, 1).then((f) => f.length > 0);

	if (await has('**/*.go')) {
		return ['**/*_test.go'];
	}
	if (await has('**/package.json')) {
		return ['**/*.test.{ts,js,tsx,jsx}', '**/*.spec.{ts,js,tsx,jsx}'];
	}
	if (await has('**/*.java')) {
		return ['**/*.java'];
	}
	return ['**/*_test.*'];
}

const EXAMPLE_REQ = `feature: EXAMPLE

requirements:
  - id: EXAMPLE-1
    title: Example Requirement
    description: >
      Replace this with a description of what the system should do.
    status: active
    deciders: []
    consulted: []
    date: ${new Date().toISOString().split('T')[0]}
    rationale: >
      Explain why this requirement exists.
    superseded_by:
    acceptance_criteria:

      - id: EXAMPLE-1-1
        title: Example Acceptance Criterion
        description: >
          Given some precondition,
          when some action is taken,
          then some outcome is expected.
`;

const SPOOL_MD = `# SPOOL.md

Spool is a requirements traceability tool. It links structured requirements (defined in \`.req\` YAML files) to test annotations in source code, then reports which acceptance criteria have tests and which don't.

## .req File Format

Each \`.req\` file defines one feature and its requirements. Files live in the \`.spool/\` directory.

\`\`\`yaml
feature: AUTH                          # Uppercase name, must match ID prefix

requirements:
  - id: AUTH-1                         # PREFIX-N format
    title: User Login
    description: >
      The system must authenticate users via email and password.
    status: active                     # active | draft | deprecated
    deciders:                          # Who decided on this requirement
      - Jane Smith
    consulted: []                      # Who was consulted
    date: 2026-03-28                   # When the requirement was created
    rationale: >                       # Why this requirement exists
      Email/password is the simplest auth method for MVP.
    superseded_by:                     # If deprecated, what replaced it
    acceptance_criteria:

      - id: AUTH-1-1                   # PREFIX-N-N format
        title: Valid Credentials
        description: >
          Given a registered user with valid credentials,
          when login is attempted,
          then authentication succeeds and a session is created.

      - id: AUTH-1-2
        title: Invalid Password
        description: >
          Given a registered user with an incorrect password,
          when login is attempted,
          then authentication fails with an error message.
\`\`\`

## Key Rules

- **One feature per file.** The filename is typically \`featurename.req\`.
- **IDs must match the feature prefix.** Feature \`AUTH\` → requirements \`AUTH-1\`, \`AUTH-2\` → ACs \`AUTH-1-1\`, \`AUTH-1-2\`.
- **IDs are uppercase with no leading zeros.** \`AUTH-1-1\`, not \`auth-01-01\`.
- **Only \`status: active\` requirements are tracked** for coverage. Use \`draft\` for work-in-progress and \`deprecated\` for retired requirements.
- **Descriptions use Given/When/Then format** for acceptance criteria (recommended, not enforced).

## Test Annotations

Link a test to an AC by placing a comment with the AC's Spool ID above the test function:

\`\`\`go
// AUTH-1-1
func TestValidLogin(t *testing.T) {
    // test implementation
}
\`\`\`

\`\`\`typescript
// AUTH-1-2
it('rejects invalid password', () => {
    // test implementation
});
\`\`\`

\`\`\`python
# AUTH-1-1
def test_valid_login():
    # test implementation
\`\`\`

Supported comment styles: \`//\` and \`#\`. Multiple annotations can be stacked above a single test function.

## Configuration

\`.spool.yaml\` at the project root:

\`\`\`yaml
test_patterns:
  - "**/*_test.go"           # Go
  # - "**/*.test.{ts,js}"    # Jest/Vitest
  # - "**/*.spec.{ts,js}"    # Playwright
  # - "**/*.java"            # JUnit
\`\`\`

## Running

\`\`\`bash
spool                # Print traceability report
spool lsp            # Start LSP server (used by editor extensions)
\`\`\`
`;
