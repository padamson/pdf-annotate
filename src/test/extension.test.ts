import * as assert from 'assert';
import * as vscode from 'vscode';
//import * as pdfannotate from '../extension';
import { Workbench, WebView, By, EditorView } from 'vscode-extension-tester';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('pdf-annotate extension is installed and activated', async () => {
		const extensionId = 'padamson.pdf-annotate';
		const extension = vscode.extensions.getExtension(extensionId);

		assert.ok(extension, `Extension ${extensionId} is not installed.`);

		await extension?.activate();
		assert.ok(extension.isActive, `Extension ${extensionId} is not activated.`);
	});

	test('pdf-annotate is the only installed extension', async () => {
		const installedExtensions = vscode.extensions.all.filter(ext => !ext.packageJSON.isBuiltin);
		const expectedExtensionId = 'padamson.pdf-annotate';

		assert.strictEqual(installedExtensions.length, 1, 'There are other non-builtin extensions installed.');
		assert.strictEqual(installedExtensions[0].id, expectedExtensionId, `Expected only ${expectedExtensionId} to be installed.`);
	});

	test('viewPDF command exists', async () => {

		const commands = await vscode.commands.getCommands();
		assert.ok(commands.includes('pdf-annotate.viewPDF'), 'viewPDF command does not exist');
	});

});
