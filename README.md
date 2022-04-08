# Print Ready

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

A JavaScript-powered CLI for converting HTML into PDFs.

**EXPERIMENTAL:** This project is still in the very early stages and should not be relied upon for production. At this point, I'm just looking for feedback and fixing bugs.

## Prerequisites

* Node.js 12.22+

## Usage

Install using [npm][npm] or [yarn][yarn]:

```shell
npm install @humanwhocodes/print-ready --save

# or

yarn add @humanwhocodes/print-ready
```

Then on the command line:

```shell
npx print-ready foo.html
```

This will render `foo.html` to a file named `foo.pdf`. You can also override the output filename:

```shell
npx print-ready foo.html -o bar.pdf
```

## How It Works

PrintReady uses [PagedJS](https://pagedjs.org) to render your HTML file inside [Puppeteer](https://developers.google.com/web/tools/puppeteer/) and then exports a PDF from Puppeteer.

## Developer Setup

1. Fork the repository
2. Clone your fork
3. Run `npm install` to setup dependencies
4. Run `npm test` to run tests

## Acknowledgements

This project is based on [PagedJS-CLI](https://gitlab.coko.foundation/pagedjs/pagedjs-cli/), an MIT-licensed project. While not strictly a fork, this project does use some code from PagedJS-CLI.

## Frequently Asked Questions

**Why don't you just use the PagedJS-CLI?**

I tried, but it kept crashing on me and it doesn't appear to be maintained any longer. Rather than giving up, I decided to write my own.

**Why haven't you implemented all the features PagedJS-CLI?**

For my purposes I don't need all of the features of PagedJS-CLI. However, I'm open to contributions to add those extra features.
