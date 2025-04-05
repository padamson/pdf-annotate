// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pdf-annotate" is now active!');

	
	const openPDFCommand = vscode.commands.registerCommand('pdf-annotate.openPDF', async (uri?: vscode.Uri) => {
		if (!uri) {
            // No URI provided, could add file picker here later
            return;
        }

        // Generate the .paj file path based on the PDF path
        const pdfPath = uri.fsPath;
        const pajPath = pdfPath.replace(/\.pdf$/i, '.paj');

        // Check if .paj file already exists
        const fs = require('fs');
        const path = require('path');
        
        if (!fs.existsSync(pajPath)) {
            // Create a new .paj file with default structure
            const pajContent = {
                'pdf-file': path.basename(pdfPath),
                'annotations': []
            };
            
            // Write the .paj file
            fs.writeFileSync(pajPath, JSON.stringify(pajContent, null, 2));
        }
        
        // Future: Add code to open the PDF and .paj file in editors
	});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const viewPAJCommand = vscode.commands.registerCommand('pdf-annotate.viewPAJ', async () => {
		
		
		const tempPdfPath = path.join(context.extensionPath, 'dist', 'temp.pdf');
		const tempPajPath = path.join(context.extensionPath, 'dist', 'temp.paj');
    
		let pajPath: string;
		let pdfPath: string;
		
		if (fs.existsSync(tempPajPath)) {
			pajPath = tempPajPath;
			pdfPath = tempPdfPath;
		} else {
			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select PAJ File',
				filters: {
					'PAJ Files': ['paj'],
					'All Files': ['*']
				},
				defaultUri: vscode.Uri.file(path.join(context.extensionPath)),
			};
	
			const fileUri = await vscode.window.showOpenDialog(options);
			if (fileUri && fileUri[0]) {
				pajPath = fileUri[0].fsPath;
			} else {
				vscode.window.showErrorMessage('No file selected. Please select a PAJ file.');
				return;
			}
			//pdfPath is pajPath with .pdf extension
			pdfPath = pajPath.replace('.paj', '.pdf');
			//check that pdfPath exists and if not, throw an error
			if (!fs.existsSync(pdfPath)) {
				vscode.window.showErrorMessage('The selected PAJ file does not have a corresponding PDF file.');
				return;
			}
		}


		console.log('pajPath:', pajPath);

		// Open the .paj file as a text document
		const pajDocument = await vscode.workspace.openTextDocument(pajPath);

		// Show the .paj file in a text editor in the specified column
		await vscode.window.showTextDocument(pajDocument, {
			viewColumn: vscode.ViewColumn.One,
			preserveFocus: true,
			preview: false
		});


		const pdfPanel = vscode.window.createWebviewPanel(
			'viewPDF', // Identifies the type of the webview. Used internally
			//the title of the panel should be the PDF file name at pdfPath
			path.basename(pdfPath), // Title of the panel displayed to the user
			vscode.ViewColumn.Two, // Editor column to show the new webview panel in
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist'))],
			} // Webview options. More on these later.
		);

		console.log('pdfPath:', pdfPath);
		pdfPanel.webview.html = getWebviewContent(context, pdfPanel, pdfPath);


	});

	context.subscriptions.push(openPDFCommand, viewPAJCommand);
}

// This method is called when your extension is deactivated
export function deactivate() { }

// Function to provide HTML content for the webview panel
function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, pdfPath: string): string {
	const htmlPath = path.join(context.extensionPath, 'dist', 'index.html');
	let htmlContent = fs.readFileSync(htmlPath, 'utf8');

	const indexJsPath = path.join(context.extensionPath, 'dist', 'index.js');
	let indexJsContent = fs.readFileSync(indexJsPath, 'utf8');

	const toolkitPath = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'toolkit.js'));
	const toolkitUri = panel.webview.asWebviewUri(toolkitPath);

	const workerMjsPath = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'pdf.worker.mjs'));
	const workerMjsUri = panel.webview.asWebviewUri(workerMjsPath);

	const pdfUri = vscode.Uri.file(pdfPath).with({ scheme: 'vscode-resource' });
	const pdfDatabase64 = fs.readFileSync(pdfPath).toString('base64');

	htmlContent = htmlContent.replace('{{pdfSrc}}', pdfUri.toString());
	htmlContent = htmlContent.replace('{{indexJsCode}}', indexJsContent.toString());
	htmlContent = htmlContent.replace('{{pdfDataBase64}}', pdfDatabase64);
	htmlContent = htmlContent.replace('{{workerMjsUri}}', workerMjsUri.toString());
	htmlContent = htmlContent.replace('{{toolkitUri}}', toolkitUri.toString());

	return htmlContent;

}