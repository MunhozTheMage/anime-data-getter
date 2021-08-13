const puppeteer = require("puppeteer");

const ANIME_NAME = "Miss Kobayashi's Dragon Maid";

const generateFunimationUrl = (anime) =>
  `https://www.funimation.com/shows/${anime}`;
const generateCrunchyrollUrl = (anime) =>
  `https://www.crunchyroll.com/pt-br/${anime}`;

const funimation = async (page, url) => {
  await page.goto(url, { waitUntil: "networkidle0" });

  const data = await page.evaluate(() => {
    try {
      if (
        document.querySelector('[data-test="not-found__primary-text"]') ||
        document.querySelector(".out-of-territory")
      )
        return null;

      const divStyle = document.querySelector(
        ".content-hero__poster-art .v-image .v-image__image"
      ).style.backgroundImage;

      const imageUrl = divStyle.slice(5, divStyle.length - 2);
      const title = document.querySelector(".content-hero--meta h1").innerText;
      const description = document.querySelector(
        ".content-hero--meta .v-card__text.order-3"
      ).innerText;

      const episodeDomElements = document.querySelector(
        '[data-test="episode-card-grid__grid-layout"]'
      ).children;

      const episodes = [...episodeDomElements].map((episodeDomElement) => {
        const number = episodeDomElement
          .querySelector(".overline")
          .innerText.split(" ")[1];

        const title =
          episodeDomElement.querySelector(".v-card__title").innerText;

        return {
          number,
          title,
        };
      });

      console.log("Everything ok!");

      return {
        imageUrl,
        title,
        description,
        episodes,
      };
    } catch (error) {
      console.log(error);
    }
  });

  return data;
};

const crunchyroll = async (page, url) => {
  await page.goto(url, { waitUntil: "networkidle0" });

  const data = await page.evaluate(() => {
    try {
      if (document.querySelector(".error-text")) return null;

      const imageUrl = document.querySelector(".poster").src;
      const title = document.querySelector(".ellipsis span").innerText;
      const description = document.querySelector(".more").innerText.trim();

      const seasons = [...document.querySelector(".list-of-seasons").children];

      if (seasons.length > 1) {
        seasons[0].querySelector(".season-dropdown").click();
      }

      const episodes = seasons.reduce((arr, seasonDomElement) => {
        const eps = [...seasonDomElement.querySelectorAll(".group-item")].map(
          (episodeDomElement) => {
            const number = episodeDomElement
              .querySelector(".series-title")
              .innerText.trim()
              .split(" ")[1];
            const title = episodeDomElement.querySelector("p").innerText.trim();

            return {
              number,
              title,
            };
          }
        );

        return [...arr, ...eps];
      }, []);

      console.log("Everything ok!");

      return {
        imageUrl,
        title,
        description,
        episodes,
      };
    } catch (error) {
      return null;
    }
  });

  return data;
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const urlAnimeName = ANIME_NAME.replace(/[^a-z0-9 ]/gi, "")
    .toLocaleLowerCase()
    .split(" ")
    .join("-");
  const funimationUrl = generateFunimationUrl(urlAnimeName);
  const crunchyrollUrl = generateCrunchyrollUrl(urlAnimeName);

  let funimationData = null;
  let crunchyrollData = null;

  try {
    crunchyrollData = await crunchyroll(page, crunchyrollUrl);

    if (!crunchyrollData) {
      funimationData = await funimation(page, funimationUrl);
    }
  } catch (error) {
    console.log(error.message);
  }

  console.log(crunchyrollData || funimationData);

  await browser.close();
})();
