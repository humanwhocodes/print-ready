#!/usr/bin/env node

/**
 * @fileoverview The execute CLI application
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { Printer } from "./print-ready.js";
import fs from "node:fs/promises";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

let debug = false;

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Sets up debugging messages on the given printer.
 * @param {Printer} printer The printer to set up events for.
 * @returns {void} 
 */
function setupDebugMessages(printer) {
    for (const eventName of printer.supportedEvents) {
        printer.on(eventName, data => console.error(eventName, data));
    }
}

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

(async() => {
    const printer = new Printer();

    if (debug) {
        setupDebugMessages(printer);
    }

    const pdf = await printer.printFileToPdf("../../writing/understanding-javascript-promises/print/book.html");
    await fs.writeFile("book.pdf", pdf);
})();
