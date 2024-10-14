import * as assert from 'assert';
import { Workbench, WebView, By, EditorView, WebElement } from 'vscode-extension-tester';
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
            const canvasElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/canvas[@id="pdf-render"]'));
            assert.strictEqual(canvasElements.length, 1, 'No canvas elements found, PDF might not be rendered');
        });

        it('checks that the first page text is rendered in the webview', async () => {    
            await testPageRender(1, webView);
        });

        it(`checks that "Previous Page" and "Next Page" buttons ${testCase.buttonPresence} present`, async () => {
            const { nextButton, prevButton } = await getButtons(webView);
            assert.strictEqual(prevButton.length, testCase.numButtons, `"Previous Page" button count ${prevButton.length}, should be ${testCase.numButtons}`);
            assert.strictEqual(nextButton.length, testCase.numButtons, `"Next Page" button count ${nextButton.length}, should be ${testCase.numButtons}`);
        });

        it('checks that clicking the Next Page and Previous Page buttons changes the text', async () => {

            if (testCase.numPages > 1) {
                const { nextButton, prevButton } = await getButtons(webView);
                await nextButton[0].click();
                await testPageRender(2, webView);
                await prevButton[0].click();
                await testPageRender(1, webView);
            }
        });
    });
});


interface PageTextTestCase {
    index: number;
    expectedText: string;
}

async function getPageTestCases(pageNumber: number, textElements_length: number): Promise<PageTextTestCase[]> {
    const testCases: PageTextTestCase[] = [
        { index: 0, expectedText: 'Top Left' },
        { index: 2, expectedText: 'Top Right' },
        { index: textElements_length - 3, expectedText: 'Bottom Left' },
        { index: textElements_length - 1, expectedText: 'Bottom Right' }
    ];

    if (pageNumber === 1) {
        testCases.push({ index: 3, expectedText: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.' });
    } else if (pageNumber === 2) {
        testCases.push({ index: 3, expectedText: 'Nam dui ligula, fringilla a, euismod sodales, sollicitudin vel, wisi.' });
    } else {
        console.error('Invalid page number:', pageNumber);
    }

    return testCases;
};

async function getButtons(webView: WebView) {
    const nextButton = await webView.findWebElements(By.xpath('//vscode-button[@id="next-page"]'));
    const prevButton = await webView.findWebElements(By.xpath('//vscode-button[@id="prev-page"]'));
    return { nextButton, prevButton };
}

async function testPageRender(pageNumber: number, webView: WebView) {

    let textElements: WebElement[] = [];
    let attempts = 0;
    let originalText = '';
    while (attempts < 10) {
        textElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/div[@id="text-layer"]//div'));
        originalText = await textElements[0].getText();
        if (originalText === 'Top Left') {
            break;
        }
        attempts++;
        await new Promise(res => setTimeout(res, 500));
    }

    const subTestCases = await getPageTestCases(pageNumber, textElements.length);

    for (const subTestCase of subTestCases) {
        const text = await textElements[subTestCase.index].getText();
        assert.strictEqual(text, subTestCase.expectedText, `Expected text "${subTestCase.expectedText}" is not found at index ${subTestCase.index}`);
    }
}

