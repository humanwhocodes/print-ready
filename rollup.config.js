/**
 * @fileoverview Rollup configuration file
 * @author Nicholas C. Zakas
 */

export default [
    {
        input: "src/print-ready.js",
        output: [
            {
                file: "dist/print-ready.cjs",
                format: "cjs"
            },
            {
                file: "dist/print-ready.js",
                format: "esm"
            }
        ]
    },
    {
        input: "src/cli.js",
        output: [
            {
                banner: "#!/usr/bin/env node\n",
                file: "dist/cli.js",
                format: "esm"
            }
        ]
    }    
];
