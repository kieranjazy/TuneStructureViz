import puppeteer from "puppeteer";
import fs from "fs"

async function parse() {
    let totalDict = {};

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser'
    });
    const page = await browser.newPage();

    for (let i = 1; i <= 101; i++) {
        await page.goto("https://thesession.org/tunes/collections/1?page=" + i);

        const manifest = await page.waitForSelector('.manifest-inventory');

        const childDict = await page.evaluate(_ => {
            let dict = {};
            let children = document.querySelectorAll('.manifest-inventory')[0].children;

            [...children].forEach((child) => {
                dict[child.getAttribute('value')] = child.children[0].children[0].getAttribute('data-tuneid');
            })

            return dict;
        });

        totalDict = Object.assign({}, childDict, totalDict);
    }

    fs.writeFileSync('./sessionMapping.json', JSON.stringify(totalDict, null, 2) , 'utf-8');
}

parse()