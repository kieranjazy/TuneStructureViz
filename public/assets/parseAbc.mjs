import puppeteer from "puppeteer";
import fs from "fs"

async function parse() {
    let dict = {};

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser'
    });
    const page = await browser.newPage();

    for (let i = 1; i != 1002; i++) {
        let paddedString = i + ".abc";
        paddedString = paddedString.padStart(8, '0');
        await page.goto("http://trillian.mit.edu/~jc/music/book/ONeills/1001/X/" + paddedString);
        await page.waitForSelector('pre');
        const result = await page.evaluate(_ => {
            function getFirst8Bars(abcString) {
                let barCount = 0;
                let result = '';
                let inBar = false;
                for (let i = 0; i < abcString.length; i++) {
                    if (abcString[i] === '|') {
                        if (inBar) {
                            barCount++;
                            if (barCount === 8) {
                                result += '|';
                                break;
                            }
                        }
                        inBar = true;
                    } else if (abcString[i] === '\n') {
                        inBar = false;
                        barCount = 0;
                    } else {
                        inBar = false;
                    }
                    result += abcString[i];
                }
                return result;
            }

            let s = document.querySelector('pre').innerHTML;
            let list = s.split("\n");

            let i = 12;
            if (list[i].startsWith('M:')) {
                i += 3;
            }
            if (list[i].startsWith('L:')) {
                i += 2;
            }
            if (list[i].startsWith('K:')) {
                i += 1;
            }
            if (list[i].startsWith('W:')) {
                i -= 1;
            }

            let abc = list[i];

            return getFirst8Bars(abc);
        });

        dict[i] = result;
    }

    await browser.close();

    console.log(JSON.stringify(dict, null, 2));
    await fs.writeFile('./abcMapping.json', JSON.stringify(dict, null, 2), 'utf-8', () => {});
}

parse();