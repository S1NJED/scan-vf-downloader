const cheerio = require("cheerio");

module.exports = {
    mangaNameFormatting,
    requestPage,
    getMangaList,
    isMangaAvailable
}

function mangaNameFormatting(mangaName) {
    return mangaName.toLowerCase() == "one piece" ? mangaName.toLowerCase().replace(/\s/g, "_") : mangaName.toLowerCase().replace(/\s/g, "-");
}

async function requestPage(url) {
    return cheerio.load( ( await (await fetch(url)).text() ) );
}

async function isMangaAvailable(formattedMangaName) {
    const url  = "https://www.scan-vf.net/" + formattedMangaName;
    const $ = await requestPage(url);
    let error = $("div.error-page").text() || null;
    return error ? false : true;
}

async function getMangaList () {
    let indexPage = 0;
    let ret = { mangas: [] };

    while (indexPage++ < 2) {

        let mangaListUrl = "https://www.scan-vf.net/filterList?page=" + indexPage + "&cat=&alpha=&sortBy=name&asc=true&author=&artist=&tag=";
        const $ = await requestPage(mangaListUrl);

        const mangasDiv = $("div.col-sm-6 > div.media");

        mangasDiv.each((i, elem) => {
            const mangaName = $(elem).find("div.media-body > h5 a").text();
            const mangaLink = $(elem).find("div.media-left > a").attr("href");
            const mangaUrl = $(elem).find("div.media-left > a > img").attr("src");
            
            ret["mangas"].push({
                mangaName: mangaName,
                mangaLink: mangaLink,
                mangaUrl: mangaUrl
            });
        })
    }
    return ret;
}