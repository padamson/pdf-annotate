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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('pdf-annotate.viewPDF', async () => {
		
		const tempPdfPath = path.join(context.extensionPath, 'dist', 'temp.pdf');
    
		let pdfPath: string;
		
		if (fs.existsSync(tempPdfPath)) {
			pdfPath = tempPdfPath;
		} else {
			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select PDF File',
				filters: {
					'PDF Files': ['pdf'],
					'All Files': ['*']
				},
				defaultUri: vscode.Uri.file(path.join(context.extensionPath)),
			};
	
			const fileUri = await vscode.window.showOpenDialog(options);
			if (fileUri && fileUri[0]) {
				pdfPath = fileUri[0].fsPath;
			} else {
				vscode.window.showErrorMessage('No file selected. Please select a PDF file.');
				return;
			}
		}

		const panel = vscode.window.createWebviewPanel(
			'viewPDF', // Identifies the type of the webview. Used internally
			'PDF Viewer', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist'))],
			} // Webview options. More on these later.
		);

		console.log('pdfPath:', pdfPath);
		panel.webview.html = getWebviewContent(context, panel, pdfPath);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }

// Function to provide HTML content for the webview panel
function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, pdfPath: string): string {
	const htmlPath = path.join(context.extensionPath, 'dist', 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

	const indexJsPath = path.join(context.extensionPath, 'dist', 'index.js');
    let indexJsContent = fs.readFileSync(indexJsPath, 'utf8');

	const workerMjsPath = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'pdf.worker.mjs'));
	const workerMjsUri = panel.webview.asWebviewUri(workerMjsPath);

    const pdfUri = vscode.Uri.file(pdfPath).with({ scheme: 'vscode-resource' });
	const pdfDatabase64 = fs.readFileSync(pdfPath).toString('base64');

    htmlContent = htmlContent.replace('{{pdfSrc}}', pdfUri.toString());
    htmlContent = htmlContent.replace('{{indexJsCode}}', indexJsContent.toString());
	htmlContent = htmlContent.replace('{{pdfDataBase64}}', pdfDatabase64);
	htmlContent = htmlContent.replace('{{workerMjsUri}}', workerMjsUri.toString());

    return htmlContent;

}