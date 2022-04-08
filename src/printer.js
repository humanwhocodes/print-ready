/**
 * @fileoverview Contains the class that prints PDFs.
 * @author Nicholas C. Zakas
 */

/*global window, CSS*/

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import puppeteer from "puppeteer";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import EventEmitter from "node:events";

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

/** @typedef {import("puppeteer").PDFOptions} PuppeteerPDFOptions */
/** @typedef {import("puppeteer").LaunchOptions} PuppeteerLaunchOptions */
/**
 * @typedef {Object} PDFOptions
 * @property {"portrait"|"landscape"} [orientation] The page orientation.
 * @property {string} [height] The page height using CSS units.
 * @property {string} [width] The page width using CSS units.
 */

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(__dirname);
const pagedJSUrl = pathToFileURL(
    require.resolve("pagedjs/dist/paged.polyfill.js")
);

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Creates a Puppeteer options object.
 * @returns {PuppeteerLaunchOptions} A Puppeteer options object.
 */
function createPuppeteerOptions() {
    return {
        headless: true,
        args: [
            "--disable-dev-shm-usage",
            "--export-tagged-pdf",
            "--allow-file-access-from-files"
        ],
        ignoreHTTPSErrors: true
    };
}

/**
 * Creates the options object for rendering PDFs in Puppeteer.
 * @param {PDFOptions} options The PDF options.
 * @returns {PuppeteerPDFOptions} An object containing the
 *      PDF options.
 */
function createPdfOptions(options = {}) {
    return {
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: options.width ? false : true,
        width: options.width,
        height: options.height,
        orientation: options.orientation,
        margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        }
    };
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

export class Printer extends EventEmitter {
    
    constructor({
        cwd = process.cwd()
    } = {}) {

        super();

        /**
         * The current working directory.
         * @type {string}
         */
        this.cwd = cwd;
    }

    get supportedEvents() {
        return [
            "navigationstart",
            "navigationend",
            "renderstart",
            "renderend",
            "rendered",
            "page",
            "size",
            "pdfstart",
            "pdfend"
        ];
    }

    /**
     * Converts the given file into a PDF.
     * @param {string} filePath A relative or absolute file path to a file
     *      that should be converted to a PDF. 
     * @returns {Promise<Buffer>} The PDF blob.
     */
    async printFileToPdf(filePath) {
        const fullFilePath = path.resolve(this.cwd, filePath);
        const fileUrl = pathToFileURL(fullFilePath);
        
        return this.printUrlToPdf(fileUrl);
    }

    /**
     * Converts the given file into a PDF.
     * @param {string} url The URL to convert into a PDF. 
     * @returns {Promise<Buffer>} The PDF blob.
     */
    async printUrlToPdf(url) {

        const browser = await puppeteer.launch(
            createPuppeteerOptions()
        );
        const page = await browser.newPage();
        this.emit("navigationstart", { url });

        // navigate to the page
        await page.goto(url, {
            waitUntil: "networkidle0"
        });
        
        this.emit("navigationend", { url });
        
        // inject the PagedJS script
        await page.evaluate(() => {
            window.PagedConfig = window.PagedConfig || {};
            window.PagedConfig.auto = false;
        });
        await page.addScriptTag({ url: pagedJSUrl });

        /*
         * Add handlers to the page in order to trigger events.
         * Without this, the operation is completely opaque and
         * difficult to debug.
         */
        await page.exposeFunction("onSize", size => {
            this.emit("size", { size });
        });

        await page.exposeFunction("onPage", (page) => {
            this.emit("page", { page });
        });

        await page.exposeFunction("onRendered", (msg, operation) => {
            this.emit("renderend", {
                message: msg,
                operation
            });
        });

        /*
        * Starts rendering by configuring PagedJS and triggering
        * the "preview", which actually renders the page correctly
        * so in the next step it can be converted to a PDF.
        */

        this.emit("renderstart");
        
        await page.evaluate(async () => {
            let done;
            window.PagedPolyfill.on("page", (page) => {
                const { id, width, height, startToken, endToken, breakAfter, breakBefore, position } = page;

                const mediabox = page.element.getBoundingClientRect();
                const cropbox = page.pagebox.getBoundingClientRect();

                function getPointsValue(value) {
                    return (Math.round(CSS.px(value).to("pt").value * 100) / 100);
                }

                let boxes = {
                    media: {
                        width: getPointsValue(mediabox.width),
                        height: getPointsValue(mediabox.height),
                        x: 0,
                        y: 0
                    },
                    crop: {
                        width: getPointsValue(cropbox.width),
                        height: getPointsValue(cropbox.height),
                        x: getPointsValue(cropbox.x) - getPointsValue(mediabox.x),
                        y: getPointsValue(cropbox.y) - getPointsValue(mediabox.y)
                    }
                };

                window.onPage({ id, width, height, startToken, endToken, breakAfter, breakBefore, position, boxes });
            });

            window.PagedPolyfill.on("size", (size) => {
                window.onSize(size);
            });

            window.PagedPolyfill.on("rendered", (flow) => {
                let msg = "Rendering " + flow.total + " pages took " + flow.performance + " milliseconds.";
                window.onRendered(msg, {
                    pageCount: flow.total,
                    orientation: flow.orientation,
                    size: flow.size,
                    time: flow.performance,
                });
            });

            if (window.PagedConfig.before) {
                await window.PagedConfig.before();
            }

            done = await window.PagedPolyfill.preview();

            if (window.PagedConfig.after) {
                await window.PagedConfig.after(done);
            }
        }).catch((error) => {
            throw error;
        });

        await page.waitForSelector(".pagedjs_pages");

        // generate the PDF
        this.emit("pdfstart");
        const blob = await page.pdf(createPdfOptions());
        this.emit("pdfend");

        // cleanup
        await page.close();
        await browser.close();

        return blob;
    }

}
