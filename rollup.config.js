/**
 * @fileoverview Rollup configuration file
 * @author Nicholas C. Zakas
 */

export default [
    {
        input: "src/data-extractor.js",
        output: [
            {
                file: "dist/data-extractor.cjs",
                format: "cjs"
            },
            {
                file: "dist/data-extractor.js",
                format: "esm"
            }
        ]
    }    
];
