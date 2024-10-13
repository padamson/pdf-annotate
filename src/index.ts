import * as pdfjsLib from "pdfjs-dist";

function renderPage(pageNumber: number) {
    pdfDocument.getPage(pageNumber).then(page => {
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });

        if (!canvas || !textLayerDiv) {
            console.error('Canvas or text layer element not found');
        } else {
            console.log('Canvas and text layer element found');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) {
            console.error('Failed to get canvas context');
        } else {
            console.log('Canvas context found');
        }

        const renderContext = {
            canvasContext: canvasContext!,
            viewport: viewport
        };

        page.render(renderContext);

        // Clear previous text layer content
        textLayerDiv.innerHTML = '';

        // Set text layer position and dimensions
        Object.assign(textLayerDiv.style, {
            left: (canvas.offsetLeft + textLayerOffsetX) + 'px',
            top: (canvas.offsetTop + textLayerOffsetY) + 'px',
            height: canvas.height + 'px',
            width: canvas.width + 'px',
            position: 'absolute',
            pointerEvents: 'none',
            transform: scale * textLayerScale
        });

        page.getTextContent().then(textContent => {
            textContent.items.forEach(item => {
                if ('transform' in item) {
                    const tx = pdfjsLib.Util.transform(
                        viewport.transform,
                        item.transform
                    );
                    const style = textContent.styles[item.fontName];

                    const textDiv = document.createElement('div');
                    textDiv.textContent = item.str;

                    // Calculate the horizontal scaling factor
                    const scaleX = item.width / (item.str.length * tx[0]);

                    Object.assign(textDiv.style, {
                        position: 'absolute',
                        left: tx[4] + 'px',
                        top: tx[5] + 'px',
                        fontSize: tx[0] + 'px',
                        fontFamily: style.fontFamily,
                        transform: scaleX,
                        pointerEvents: 'all'
                    });

                    textLayerDiv.appendChild(textDiv);
                } else {
                    console.log('Item is not a TextItem, skipping...');
                }
            });
        });

    }).catch(error => {
        console.error('Error rendering page:', error);
    });
}

if (typeof pdfjsLib === 'undefined') {
    console.error('pdfjsLib is not defined');
} else {
    console.log('pdfjsLib is defined and version is:', pdfjsLib.version);
}

pdfjsLib.GlobalWorkerOptions.workerSrc = '{{workerMjsUri}}';

if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
    console.log('PDF.js workerSrc is set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
} else {
    console.error('PDF.js workerSrc is not set.');
}

const pdfViewer = document.getElementById('pdf-viewer') as HTMLDivElement;
const canvas = document.getElementById('pdf-render') as HTMLCanvasElement;
const textLayerDiv = document.getElementById('text-layer') as HTMLDivElement;

let currentPage = 1;
let pdfDocument: pdfjsLib.PDFDocumentProxy;
let scale = 1.5;
let numPages: number;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;

// Load the PDF
const loadingTask = pdfjsLib.getDocument({ data: atob('{{pdfDataBase64}}') });
loadingTask.promise.then(function (pdf) {
    pdfDocument = pdf;
    numPages = pdfDocument.numPages;
    console.log('Number of pages in the PDF before rendering:', numPages);
    renderPage(currentPage);
    console.log('Number of pages in the PDF after rendering:', numPages);

    if (numPages > 1) {
        console.log('Number of pages is ', numPages, ' so adding buttons...');
        const controls = document.getElementById('controls');
        if (controls) {
            controls.innerHTML = '<vscode-panels> <vscode-panel-view id="buttons"> <vscode-button id="prev-page">Previous Page</vscode-button> <vscode-button id="next-page">Next Page</vscode-button> </vscode-panel-view> </vscode-panels>';
        }
        prevButton = document.getElementById('prev-page') as HTMLButtonElement;
        nextButton = document.getElementById('next-page') as HTMLButtonElement;
    
        // Add event listeners to the buttons
        if (prevButton) {
            (prevButton as HTMLButtonElement).addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderPage(currentPage);
                }
            });
        }

        if (nextButton) {
            (nextButton as HTMLButtonElement).addEventListener('click', () => {
                if (currentPage < pdfDocument.numPages) {
                    currentPage++;
                    renderPage(currentPage);
                }
            });
        }
    }

    if (!pdfViewer || !canvas || !textLayerDiv || (numPages > 1 && (!prevButton || !nextButton))) {
        console.error('One or more required elements are missing from the DOM');
    } else {
        console.log('All required elements are present in the DOM');
    }
}).catch(error => {
    console.error('Error loading PDF:', error);
});

let textLayerOffsetX = 0; // Adjust these values as needed
let textLayerOffsetY = -12; // Adjust these values as needed
let textLayerScale = 0.65; // Adjust these values as needed

// Add event listener for text selection
const pdfRenderElement = document.getElementById('pdf-render');
if (pdfRenderElement) {
    pdfRenderElement.addEventListener('mouseup', function () {
        const selection = window.getSelection();
        if (selection) {
            const selectedText = selection.toString();
            if (selectedText) {
                highlightSelection(selection);
            }
        }
    });
}

function highlightSelection(selection: Selection | null) {
    if (selection && selection.rangeCount && selection.getRangeAt) {
        const range = selection.getRangeAt(0).cloneRange();
        const newNode = document.createElement('span');
        newNode.classList.add('highlight');
        range.surroundContents(newNode);
    }
}

