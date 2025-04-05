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

	test('viewPAJ command exists', async () => {
		const commands = await vscode.commands.getCommands();
		assert.ok(commands.includes('pdf-annotate.viewPAJ'), 'viewPAJ command does not exist');
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

    test('openPDF command exists', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('pdf-annotate.openPDF'), 'openPDF command does not exist');
    });

    test('Opening a PDF file creates a new .paj file if it does not exist', async function () {
        this.timeout(10000);
        
        // Setup: Create a test directory and PDF file
        const testDir = path.join(__dirname, 'temp-test');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Create a minimal test PDF file
        const testPdfPath = path.join(testDir, 'test.pdf');
        const testPajPath = path.join(testDir, 'test.paj');
        
        // Create a minimal valid PDF file
        const minimalPdf = '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n171\n%%EOF';
        fs.writeFileSync(testPdfPath, minimalPdf);
        
        // Ensure .paj file doesn't exist
        if (fs.existsSync(testPajPath)) {
            fs.unlinkSync(testPajPath);
        }
        
        try {
            // Execute the command to open the PDF
            await vscode.commands.executeCommand('pdf-annotate.openPDF', vscode.Uri.file(testPdfPath));
            
            // Wait a moment for the command to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify that a .paj file was created
            assert.ok(fs.existsSync(testPajPath), '.paj file should be created when opening PDF');
            
            // Verify the basic structure of the .paj file
            const pajContent = JSON.parse(fs.readFileSync(testPajPath, 'utf8'));
            assert.strictEqual(pajContent['pdf-file'], 'test.pdf', 'PDF filename in .paj file should match the opened PDF');
            assert.ok(pajContent.hasOwnProperty('annotations'), '.paj file should have an annotations property');
        
            assert.ok(Array.isArray(pajContent.annotations), 'annotations should be an array');
            assert.strictEqual(pajContent.annotations.length, 0, 'annotations array should be empty');

        } finally {
            // Clean up
            if (fs.existsSync(testPdfPath)) {
                fs.unlinkSync(testPdfPath);
            }
            if (fs.existsSync(testPajPath)) {
                fs.unlinkSync(testPajPath);
            }
            if (fs.existsSync(testDir)) {
                fs.rmdirSync(testDir);
            }
        }
    });
});
