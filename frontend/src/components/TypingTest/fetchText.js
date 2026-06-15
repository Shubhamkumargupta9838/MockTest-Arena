const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function fetchHeadlines() {
    const url = "https://www.thehindu.com/";

    const response = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    const $ = cheerio.load(response.data);

    const headlines = [];
    let count = 0;

    $("a[href]").each((_, el) => {
        if (count > 7) return false;

        const text = $(el).text().trim().replace(/\s+/g, " ");

        if (text.length > 50 && text.length < 500) {
            headlines.push(text);
            count++;
        }
    });

    const combinedText = headlines.join("\n\n");

    // overwrite passage.json
    const data = {
        text: combinedText
    };

    fs.writeFileSync(
        "fetchPassage.json",
        JSON.stringify(data, null, 2),
        "utf8"
    );

    console.log("Saved to passage.json");
}

fetchHeadlines().catch(console.error);