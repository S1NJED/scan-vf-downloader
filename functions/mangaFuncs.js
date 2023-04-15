const fs = require("fs");
const https = require("https");
const {mangaNameFormatting, requestPage} = require("./globals");
const path = require("path");

class Manga {
    constructor(mangaName) {
        this.mangaName = mangaName;
        this.formattedMangaName = mangaNameFormatting(mangaName); // Format name for the urls
        this.mangaThumbnail = "";

        const configData = JSON.parse(fs.readFileSync("config.json"));
        this.DELAY = configData["DELAY"] || 1000; // 1000ms by default
        this.scansPath = configData["CHAPTER_PATH_DOWNLOAD"] || path.join(__dirname, "MANGAS"); // Path where the /MANGAS folder will be
        
        this.chapters = [];
        this.chaptersCount = 0;

        this.downloadQueue = [];

        // INIT
        this.initState = 0;
        this.#init();

    }

    // Synchronous initializer function
    async #init() {
        await this.getChaptersList().then(r => {return});
        this.initState = 1;
    }

    waitForInitialization() {
        return new Promise(resolve => {
            let loop = setInterval(() => {
                if (this.initState != 0) {
                    clearInterval(loop);
                    resolve(true);
                }
            }, 200)
        })
    }

    // -----------
    async getChaptersList() {
        const url = "https://www.scan-vf.net/" + this.formattedMangaName;
        const $ = await requestPage(url);

        let chapters = $("ul.chapters li");
        chapters.each((index, elem) => {

            this.chaptersCount++;
            const chapterUrl = $(elem).find("h5 > a").attr("href");
            const chapterTitle = $(elem).find("h5 > em").text() || null;
            const chapterIndex = ( $(elem).find("h5 > a").text() ).toLowerCase().replace(this.mangaName.toLowerCase() + " ", "");
            
            this.chapters.push({
                chapterUrl: chapterUrl,
                chapterTitle: chapterTitle,
                chapterIndex: chapterIndex
            });
        })

        return (this.chaptersCount ? this.chapters : false); // if length then return chapters (success) else return false (failed)
    }

    async #getChapterPageCount(url) {
        const $ = await requestPage(url)
    
        const total = $("select#page-list option");
        let count = 0;
        total.each((i, elem) => { count++; })
    
        return count;
    }

    async getChapterPagesUrls(chapter) {
        let url = chapter.chapterUrl;
        let pagesCount = await this.#getChapterPageCount(url);
        
        let ret = {
            lenght: pagesCount,
            chapterIndex: chapter.chapterIndex,
            scansUrls: []
        };    

        const $ = await requestPage(url)
        const urls = $("div.col-xs-12.col-sm-8 > div#all img"); // get all the scans urls
        
        urls.each((i, elem) => {
            const url_ = $(elem).attr("data-src");
            ret["scansUrls"].push(url_);
        })
        
        return ret;
    }

    async #scanDownloadPrivate(chapter) {
        let mangaNameFolder = this.mangaName;
        if (!fs.existsSync(path.join(this.scansPath, mangaNameFolder))) { fs.mkdirSync(path.join(this.scansPath, mangaNameFolder)) }
        if (!fs.existsSync(path.join(this.scansPath, mangaNameFolder, chapter.chapterIndex))) { fs.mkdirSync(path.join(this.scansPath, mangaNameFolder, chapter.chapterIndex)) }
        
        

        for (let i = 1; i <= chapter.scansUrls.length; i++) {
            
            await new Promise((resolve) => {
                setTimeout(() => {
                    let url = chapter.scansUrls[i-1];

                    https.get(url, res => {
                        if (res.statusCode === 200) {
                            let startTs = new Date().getTime() / 1000;

                            let imageData = '';
                            res.setEncoding('binary');
                            
                            res.on('data', chunk => {
                                imageData += chunk;
                            });
                            
                            res.on('end', () => {
                                fs.writeFile(path.join(this.scansPath, mangaNameFolder, chapter.chapterIndex, (i + ".jpg")), imageData, 'binary', err => {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        let nowTs = new Date().getTime() / 1000;
                                        console.log(`[\x1b[33m${chapter.chapterIndex}\x1b[0m] Scan \x1b[47;30m${i}\x1b[0m / ${chapter.scansUrls.length} saved! \x1b[1m${(nowTs - startTs).toFixed(2)}\x1b[0m s`);
                                    }
                                    resolve();
                                });
                            });
                        } 
                        else {
                            console.error(`Error downloading the scan. Status code: ${res.statusCode}`);
                        }
                        
                    }).on('error', err => {
                        console.error(`Error downloading scan: ${err}`);
                    });

                }, this.DELAY);
            })
        }
    }

    async startDownload() {
        for (let chapter of this.downloadQueue) {
            let currentChapter = await this.getChapterPagesUrls(chapter);
            let startTs = new Date().getTime() / 1000;
            await this.#scanDownloadPrivate(currentChapter);
            let nowTs = new Date().getTime() / 1000;
            console.log(`[\x1b[32m${chapter.chapterIndex}\x1b[0m] Total: \x1b[1m${(nowTs - startTs).toFixed(2)}\x1b[0m`);
        }
    }

}



module.exports = {Manga}