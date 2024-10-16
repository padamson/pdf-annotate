import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

	test('should open a .paj file in PdfAnnotationJsonEditor', async function() {
        this.timeout(20000);
        const pajContent = `{
            "pdf-file": "single-page.pdf",
            "annotations": {
                "annotation": "Some highlighted lorem ipsum text",
                "page": 1,
                "start-div": 3,
                "start-char": 41,
                "end-div": 5,
                "end-char": 8,
                "highlighted-text": "adipiscing elit. Ut purus"
            }
        }`;

        const filePath = path.join(__dirname, 'test.paj');
        fs.writeFileSync(filePath, pajContent);
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        assert.strictEqual(document.languageId, 'pdf-annotation-json', 'The language type of the .paj file is not pdf-annotation-json');
        const editor = await vscode.window.showTextDocument(document);
        await new Promise(res => setTimeout(res, 2000)); 
        const editorText = editor.document.getText();
        assert.strictEqual(editorText, pajContent, 'The content of the .paj file does not match the expected content');
    });

});
