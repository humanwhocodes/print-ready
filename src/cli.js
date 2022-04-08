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

const argv = yargs(process.argv.slice(2))
    .scriptName("print-ready")

// disable automatic console output
// .help(false)
// .version(false)

    // options for the command line
    .options({
        o: {
            type: "string",
            describe: "The output filename."
        },
        debug: {
            type: "boolean",
            describe: "Turn on debugging messages."
        },
        help: {
            alias: "h",
            type: "boolean",
            describe: "Show the help screen."
        },
        version: {
            alias: "v",
            type: "boolean",
            describe: "Shows the current version."
        }
    })
    .usage("$0 [options] filename")
    .argv;


//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

(async() => {
    const printer = new Printer();

    if (argv.debug) {
        setupDebugMessages(printer);
    }

    if (!argv._.length) {
        argv.showHelp();
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
