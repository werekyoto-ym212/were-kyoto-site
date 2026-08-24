import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = process.cwd();
const jobs = [
  ["contract/contract-template.html", "contract/were-contract-template.pdf"],
  ["estimate/estimate-template.html", "estimate/were-estimate-template.pdf"],
  ["invoice/invoice-template.html", "invoice/were-invoice-template.pdf"],
];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
for (const [source, destination] of jobs) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, source)).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: path.join(root, destination),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.close();
}
await browser.close();
