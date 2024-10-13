import * as assert from 'assert';
import { Workbench, WebView, By, EditorView } from 'vscode-extension-tester';
import * as path from 'path';
import * as fs from 'fs';

const testCases = [
    {
        testName: 'single-page.pdf',
        pdfFile: 'single-page.pdf',
        numPages: 1,
        numButtons: 0,
        buttonPresence: 'are not'
    },
    {
        testName: 'multi-page.pdf',
        pdfFile: 'multi-page.pdf',
        numPages: 2,
        numButtons: 1,
        buttonPresence: 'are'
    }
];

testCases.forEach(testCase => {
    
    describe(`PDF View WebView tests with ${testCase.testName}`, () => {
        let webView: WebView;

        before(async function() {

            this.timeout(8000); 

            const workbench = new Workbench();
            let commandExecuted = false;
            for (let i = 0; i < 3; i++) {
                try {
                    const extensionPath = path.resolve(__dirname);
                    let pdfFile: string;
                    let tempFilePath: string;
                    pdfFile = path.join(extensionPath, '../../', 'src', 'ui-test', 'media', testCase.pdfFile);
                    tempFilePath = path.join(extensionPath, '../../', '.test-extensions', 'padamson.pdf-annotate-0.0.1', 'dist', 'temp.pdf');
                    fs.copyFile(pdfFile, tempFilePath, (err: NodeJS.ErrnoException | null) => {
                        if (err) {
                            throw err;
                        }
                        console.log(`Copied ${pdfFile} to ${tempFilePath}`);
                    });
                    await workbench.executeCommand('pdf-annotate.viewPDF');
                    commandExecuted = true;
                    break;
                } catch (e) {
                    console.log(`Attempt ${i+1} to execute View PDF command failed. Retrying...`);
                    await new Promise(res => setTimeout(res, 1000));
                }
            }

            if (!commandExecuted) {
                throw new Error('Failed to execute command after multiple attempts');
            } else {
                console.log('View PDF command executed successfully.');
            }

            webView = new WebView();
            await webView.switchToFrame();

        });

        after(async () => {
            await webView.switchBack();
            await new EditorView().closeAllEditors();
        });

        it('checks that the PDF is rendered in the webview', async () => {
            // Look for canvas elements which are typically used to render PDF pages
            const canvasElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/canvas[@id="pdf-render"]'));
            assert.strictEqual(canvasElements.length, 1, 'No canvas elements found, PDF might not be rendered');
        });

        it('checks that the text is rendered in the webview', async () => {    
            // Optionally, you can also check for specific text or attributes that indicate a rendered PDF
            const textElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/div[@id="text-layer"]//div'));
           
            const subTestCases = [
                { index: 0, expectedText: 'Top Left' },
                { index: 2, expectedText: 'Top Right' },
                { index: 3, expectedText: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.' },
                { index: textElements.length - 3, expectedText: 'Bottom Left' },
                { index: textElements.length - 1, expectedText: 'Bottom Right' }
            ];
        
            for (const subTestCase of subTestCases) {
                const text = await textElements[subTestCase.index].getText();
                assert.strictEqual(text, subTestCase.expectedText, `Expected text "${subTestCase.expectedText}" is not found at index ${subTestCase.index}`);
            }

        });

        it(`checks that "Previous Page" and "Next Page" buttons ${testCase.buttonPresence} present`, async () => {
            const prevButton = await webView.findWebElements(By.xpath(`//vscode-button[@id="prev-page"]`));
            assert.strictEqual(prevButton.length, testCase.numButtons, `"Previous Page" button count ${prevButton.length}, should be ${testCase.numButtons}`);
        
            const nextButton = await webView.findWebElements(By.xpath(`//vscode-button[@id="next-page"]`));
            assert.strictEqual(nextButton.length, testCase.numButtons, `"Next Page" button count ${nextButton.length}, should be ${testCase.numButtons}`);
        });

    });

});
