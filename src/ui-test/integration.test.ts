import * as assert from 'assert';
import { Workbench, WebView, By, EditorView, WebElement, VSBrowser, Editor} from 'vscode-extension-tester';
import * as path from 'path';
import * as fs from 'fs';

const testCases = [
    {
        testName: 'single-page',
        pajFile: 'single-page.paj',
        pdfFile: 'single-page.pdf',
        numPages: 1,
        numButtons: 0,
        buttonPresence: 'are not'
    },
    {
        testName: 'multi-page',
        pajFile: 'multi-page.paj',
        pdfFile: 'multi-page.pdf',
        numPages: 2,
        numButtons: 1,
        buttonPresence: 'are'
    }
];

testCases.forEach(testCase => {
    
    describe(`PAJ View WebView tests with ${testCase.testName}`, () => {
        let webView: WebView;
        let workbench: Workbench;

        before(async function() {
            this.timeout(8000); 
            workbench = new Workbench();
            let commandExecuted = false;
            for (let i = 0; i < 3; i++) {
                try {
                    const extensionPath = path.resolve(__dirname);
                    const mediaPath = path.join(extensionPath, '../../', 'src', 'ui-test', 'media');
                    const distPath = path.join(extensionPath, '../../', '.test-extensions', 'padamson.pdf-annotate-0.0.1', 'dist');
                    let pdfFile: string;
                    let pajFile: string;
                    let tempPdfFilePath: string;
                    let tempPajFilePath: string;
                    pdfFile = path.join(mediaPath, testCase.pdfFile);
                    tempPdfFilePath = path.join(distPath, 'temp.pdf');
                    pajFile = path.join(mediaPath, testCase.pajFile);
                    tempPajFilePath = path.join(distPath, 'temp.paj');
                    copyFile(pdfFile, tempPdfFilePath);
                    copyFile(pajFile, tempPajFilePath);
                    await workbench.executeCommand('pdf-annotate.viewPAJ');
                    commandExecuted = true;
                    break;
                } catch (e) {
                    console.log(`Attempt ${i+1} to execute View PAJ command failed. Retrying...`);
                    await new Promise(res => setTimeout(res, 1000));
                }
            }

            if (!commandExecuted) {
                throw new Error('Failed to execute command after multiple attempts');
            } else {
                console.log('View PAJ command executed successfully.');
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

        it('checks that text selection highlights and retains previous highlights', async () => {
            let highlightedElements: WebElement[] = [];
            const textLayerDiv = await webView.findWebElement(By.id('text-layer'));
            await simulateTextSelection(workbench, webView, 0, 0, 0, 8); 
            highlightedElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/div[@id="text-layer"]//div//span[@class="highlight"]'));
            assert.strictEqual(highlightedElements.length, 1, 'Expected 1 highlighted element after first selection');
            assert.strictEqual(await highlightedElements[0].getText(), 'Top Left', 'Highlighted text should match expected text');
    
            await simulateTextSelection(workbench, webView, 2, 0, 2, 9); 
            highlightedElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/div[@id="text-layer"]//div/span[@class="highlight"]'));
            assert.strictEqual(highlightedElements.length, 2, 'Expected 2 highlighted elements after second selection');
            assert.strictEqual(await highlightedElements[1].getText(), 'Top Right', 'Highlighted text should match expected text');

            await simulateTextSelection(workbench, webView, 3, 41, 5, 8);
            highlightedElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/div[@id="text-layer"]//div/span[@class="highlight"]'));
            assert.strictEqual(highlightedElements.length, 5, 'Expected 5 highlighted elements after third selection');
            assert.strictEqual(await highlightedElements[2].getText(), 'adipiscing elit.', 'Highlighted text should match expected text');
            assert.strictEqual(await highlightedElements[4].getText(), 'Ut purus', 'Highlighted text should match expected text');
        });

    });
});

describe('PDF Annotation JSON file formatting tests', () => {
    let workbench: Workbench;
    let webView: WebView;
    const browser = VSBrowser.instance;

    before(async function () {
        this.timeout(10000);
        workbench = new Workbench();
        const extensionPath = path.resolve(__dirname);
        const pajFilePath = path.join(extensionPath, '../../', 'src', 'ui-test', 'media', 'single-page.paj');
        let tempFilePath: string;
        tempFilePath = path.join(extensionPath, '../../', '.test-extensions', 'padamson.pdf-annotate-0.0.1', 'dist', 'single-page.paj');
        fs.copyFile(pajFilePath, tempFilePath, (err: NodeJS.ErrnoException | null) => {
            if (err) {
                throw err;
            }
            console.log(`Copied ${pajFilePath} to ${tempFilePath}`);
        });
        await openResourceWithCheck(browser, tempFilePath);
        webView = new WebView();
    });

    after(async () => {
        await new EditorView().closeAllEditors();
    });

    it('checks that the language type for the editor is pdf-annotation-json', async () => {
        const editorInstance = await webView.findWebElements(By.xpath('//div[@class="editor-instance" and @data-mode-id="pdf-annotation-json"]'));
        assert.strictEqual(editorInstance.length, 1, 'Expected 1 editor instance with pdf-annotation-json language type');
    });

});


function copyFile(testFile: string, tempFilePath: string) {
    fs.copyFile(testFile, tempFilePath, (err: NodeJS.ErrnoException | null) => {
        if (err) {
            throw err;
        }
        console.log(`Copied ${testFile} to ${tempFilePath}`);
    });
}

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

async function simulateTextSelection(
    workbench: Workbench,
    webView: WebView,
    startDivIndex: number,
    startCharIndex: number,
    endDivIndex: number,
    endCharIndex: number
) {
    const textElements = await webView.findWebElements(By.xpath('/html/body/div[@id="pdf-viewer"]/div[@id="text-layer"]//div'));

    if (textElements.length > startDivIndex && textElements.length > endDivIndex) {
        const startDiv = textElements[startDivIndex];
        const endDiv = textElements[endDivIndex];

        await workbench.getDriver().executeScript(
            (startDiv: HTMLElement, startCharIndex: number, endDiv: HTMLElement, endCharIndex: number) => {
                const range = document.createRange();
                const selection = window.getSelection();

                range.setStart(startDiv.firstChild!, startCharIndex);
                range.setEnd(endDiv.firstChild!, endCharIndex);

                selection?.removeAllRanges();
                selection?.addRange(range);

                const mouseUpEvent = new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                endDiv.dispatchEvent(mouseUpEvent);
            },
            startDiv,
            startCharIndex,
            endDiv,
            endCharIndex
        );
    } else {
        console.error(`Div with index ${startDivIndex} or ${endDivIndex} not found`);
    }
}

/**
 * Function to open a resource and wait until it is ready.
 * @param browser - The VSBrowser instance.
 * @param tempFilePath - The path of the file to open.
 */
async function openResourceWithCheck(browser: VSBrowser, tempFilePath: string) {
    await browser.openResources(tempFilePath);

    for (let attempts = 0; attempts < 20; attempts++) { // Adjust the max attempts as needed
        try {
            const isOpen = await isResourceOpen(browser, tempFilePath);
            if (isOpen) {
                console.log('Resource is open and ready.');
                return;
            }
        } catch (error) {
            console.error('Error checking resource status:', error);
        }
        await new Promise(res => setTimeout(res, 200)); // Adjust the interval as needed
    }

    throw new Error('Failed to open the resource within the expected time.');
}

/**
 * Function to check if the resource is open and ready.
 * @param browser - The VSBrowser instance.
 * @param tempFilePath - The path of the file to check.
 */
async function isResourceOpen(browser: VSBrowser, tempFilePath: string): Promise<boolean> {
    // Implement the logic to check if the resource is open
    // For example, you might check if a specific element is present in the DOM
    const webView = new WebView();
    try {
        const editorInstance = await webView.findWebElements(By.xpath('//div[@class="editor-instance" and @data-mode-id="pdf-annotation-json"]'));
        if (editorInstance.length > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}