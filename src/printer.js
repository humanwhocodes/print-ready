/**
 * @fileoverview Contains the class that prints PDFs.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import EventEmitter from "node:events";

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
 * @param {*} options 
 * @returns {object} An object containing the PDF options.
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
            left: 0,
        }
    };
}

/**
 * Extracts page meta information.
 * @param {puppeteer.Page} page The page to extract from. 
 * @returns {Object} Meta information about the page.
 */
function extractMeta(page) {
    return page.evaluate(() => {
        const result = {
            title: document.title,
            lang: document.querySelector("html").lang
        };

        let metaTags = document.querySelectorAll("meta");
        for (const metaTag of metaTags) {
            if (metaTag.name) {
                result[metaTag.name] = metaTag.content;
            }
        }
        return result;
    });
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

        /**
         * The Puppeteer instance to use.
         * @type {import("puppeteer").Browser}
         */
        this.browser = undefined;
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
        ]
    };

    /**
     * 
     * @param {*} filePath 
     * @returns 
     */
    async printFileToPdf(filePath, options) {
        const fullFilePath = path.resolve(this.cwd, filePath);
        const fileUrl = pathToFileURL(fullFilePath);
        
        return this.printUrlToPdf(fileUrl);
    }

    /**
     * 
     * @param {string} url  
     */
    async printUrlToPdf(url, options) {

        const browser = await puppeteer.launch(
            createPuppeteerOptions()
        );
        const page = await browser.newPage();
        this.emit("navigationstart", { url });

        // navigate to the page
        await page.goto(url, {
            waitUntil: "networkidle0"
        });;
        
        this.emit("navigationend", { url });
        
        // inject the PagedJS script
        await page.evaluate(() => {
            window.PagedConfig = window.PagedConfig || {};
            window.PagedConfig.auto = false;
        });
        await page.addScriptTag({ url: pagedJSUrl });

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
