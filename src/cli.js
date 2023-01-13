/**
 * @fileoverview The execute CLI application
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { Printer } from "./print-ready.js";
import fs from "node:fs/promises";
import yargs from "yargs";
import path from "node:path";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------


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

const cargv = yargs(process.argv.slice(2))
    .scriptName("print-ready")
    .version(false)
    .options({
        o: {
            type: "string",
            describe: "The output filename."
        },
        debug: {
            type: "boolean",
            describe: "Turn on debugging messages."
        },
        timeout: {
            type: "number",
            describe: "Set the rendering timeout in milliseconds."
        },
        version: {
            alias: "v",
            type: "boolean",
            describe: "Shows the current version."
        }
    })
    .usage("$0 [options] filename")
    .help();

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

(async() => {
    const argv = cargv.argv;
    const printer = new Printer({ timeout: argv.timeout });

    if (argv.debug) {
        setupDebugMessages(printer);
    }

    if (!argv._.length) {
        cargv.showHelp();
        process.exit(1);
    }

    // figure out where everything goes
    const filePath = argv._[0];
    const outputFilePath = argv.o
        ? argv.o :
        `${path.basename(filePath, path.extname(filePath))}.pdf`;

    const pdf = await printer.printFileToPdf(filePath);
    await fs.writeFile(outputFilePath, pdf);
})();
