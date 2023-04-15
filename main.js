const {question} = require("readline-sync");
const {Manga} = require("./functions/mangaFuncs");
const {mangaNameFormatting, getMangaList, isMangaAvailable} = require("./functions/globals");

(async () => {
    
    let mangaName = "";
    let formattedMangaName = "";
    do {
        mangaName = question("Enter a manga name: ");
        formattedMangaName = mangaNameFormatting(mangaName);

    } while (!(await isMangaAvailable(formattedMangaName)));

    
    let currentManga = new Manga(mangaName);
    console.log("\nFetching chapters of " + mangaName + " manga...");
    await currentManga.waitForInitialization();
    console.log("Fetched " + currentManga.chaptersCount + " chapters.\n");

    currentManga.chapters.forEach((chapter, index) => {
        console.log(`[${chapter.chapterIndex}] ${chapter.chapterTitle}`);
    })

    console.log("\n====================================================\n");
    console.log("USAGE: \n \
        - add CHAPTER_INDEX (add chapter to the download queue), \n \
        - remove CHAPTER_INDEX (remove chapter from the download queue), \n \
        - show (show the download queue) \n \
        - download (to start the download)\n");

    let keywords = ["add", "remove", "show", "download"];
    do {
        let userInput = question("> ");
        let userInputArraySplitted = userInput.split(' ');
        let keyword = userInputArraySplitted[0] || null;
        let chapterIndexInput = userInputArraySplitted[1] || null;
        
        if (!keywords.includes(keyword)) {
            console.log("Please make sure to use add, remove or show.\n");
            continue;
        }
        if (!chapterIndexInput && !["show", "download"].includes(keyword)) {
            console.log("Please make sure to enter a chapter number.\n");
            continue;
        }

        let currentChapter = currentManga.chapters.find(chapter => chapter.chapterIndex == chapterIndexInput) || null;

        switch (keyword){
            case "add":
                // Already in the queue...
                if (currentManga.downloadQueue.some(chapter => chapter.chapterIndex == chapterIndexInput)) {
                    console.log("The chapter " + chapterIndexInput + " is already in the queue.\n");
                    continue;
                }

                if (currentChapter) {currentManga.downloadQueue.push(currentChapter);}
                try {
                    if (currentManga.downloadQueue.some(chapter => chapter.chapterIndex == chapterIndexInput)) {
                        console.log("Sucessfully added chapter " + chapterIndexInput + "\n");
                    }
                    else {
                        console.log("Couldn't add the chapter " + chapterIndexInput + "\n");
                    }
                } catch(err) {console.log("Can't find the chapter.\n")}
                
                break;

            case "remove":
                try {
                    let chapterUrlQueueIndex = currentManga.downloadQueue.findIndex(chapter => chapter.chapterIndex == chapterIndexInput);
                    currentManga.downloadQueue.splice(chapterUrlQueueIndex, 1);
                    if (!currentManga.downloadQueue.some(chapter => chapter.chapterIndex == chapterIndexInput)) {
                        console.log("Sucessfully removed chapter " + chapterIndexInput + "\n");
                    }
                    else {
                        console.log("Couldn't remove chapter " + chapterIndexInput + "\n");
                    }
                } catch (err) {console.log("Can't remove the chapter.\n")}
                
                break;

            case "show":
                console.log("DOWNLOAD QUEUE: "); // TODO: display only chapter index 
                for (let url of currentManga.downloadQueue) {
                    console.log(url);
                }
                console.log("\n");
                break;

            case "download":

                if (!currentManga.downloadQueue[0]) { console.log("There is nothing in the queue.\n"); continue; }

                await currentManga.startDownload();
                console.log("Download finish!");
                currentManga.downloadQueue = []; // empty the array after download is complete.
                break;
        }
        continue;

    } while (true);

})()