/**
 * @fileoverview Tests for the printer.
 * @author Nicholas C. Zakas
 */

/* global describe, it, beforeEach */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { expect } from "chai";
import { Printer } from "../src/printer.js";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("Printer", () => {


    describe("printFileToPdf()", () => {
        
        let printer;
        
        beforeEach(() => {
            printer = new Printer();
        });

        [
            {
                filename: "one-page.html",
                pageCount: 1,
                title: "Document title",
                author: "Nicholas C. Zakas",
                keywords: "test stuff things"
            }

        ].forEach(({filename, pageCount, title, author, keywords}) => {

            describe(filename, () => {

                const filePath = path.resolve(FIXTURES_DIR, filename);

                it("should have the correct metadata", async () => {
                    const blob = await printer.printFileToPdf(filePath);
                    const pdf = await PDFDocument.load(blob);

                    expect(pdf.getPageCount()).to.equal(pageCount, "Incorrect page count.");
                    expect(pdf.getAuthor()).to.equal(author, "Incorrect author.");
                    expect(pdf.getTitle()).to.equal(title, "Incorrect title.");
                    expect(pdf.getKeywords()).to.deep.equal(keywords, "Incorrect keywords.");
                    // expect(pdf.getCreator()).to.equal("PrintReady", "Incorrect creator.");
                    // expect(pdf.getProducer()).to.equal("PrintReady", "Incorrect producer.");
                    expect(pdf.getCreationDate().toDateString()).to.equal((new Date()).toDateString(), "Incorrect title.");
                    expect(pdf.getModificationDate().toDateString()).to.equal((new Date()).toDateString(), "Incorrect title.");
                });
                
            });

        });



    });
});
