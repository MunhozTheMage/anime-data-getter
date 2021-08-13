const puppeteer = require("puppeteer");

const generateFunimationUrl = (anime) =>
  `https://www.funimation.com/shows/${anime}`;
const generateCrunchyrollUrl = (anime) =>
  `https://www.crunchyroll.com/pt-br/${anime}`;

const funimation = async (page, url) => {
  await page.goto(url, { waitUntil: "networkidle0" });

  const data = await page.evaluate(async () => {
    try {
      // Gets DOM elements that indicate that FUNimation doesn't
      // have, or can't strean a certain anime on the territory
      // that it is located.

      const animeNotFoundDomElement = document.querySelector(
        '[data-test="not-found__primary-text"]'
      );
      const animeOutOfTerritoryDomElement =
        document.querySelector(".out-of-territory");

      // If any of those elements exists, there is no way to get
      // the data, so return null.
      if (animeNotFoundDomElement || animeOutOfTerritoryDomElement) return null;

      const sleep = async (ms) => await new Promise((r) => setTimeout(r, ms));

      // Gets the style that contains the image url for the anime.
      const divStyle = document.querySelector(
        ".content-hero__poster-art .v-image .v-image__image"
      ).style.backgroundImage;

      // Extracts the url from the style string.
      const imageUrl = divStyle.slice(5, divStyle.length - 2);

      // Title of the anime.
      const title = document.querySelector(".content-hero--meta h1").innerText;

      // Description of the anime.
      const description = document.querySelector(
        ".content-hero--meta .v-card__text.order-3"
      ).innerText;

      // Element in the DOM with episodes in it.
      const episodesDomContainer = document.querySelector(
        '[data-test="episode-card-grid__grid-layout"]'
      );

      // Element in the DOM that allows selection of seasons.
      const seasonSelector = document.querySelector(".v-input__control");

      const getSelectedSeasonName = () =>
        seasonSelector.querySelector(".v-select__selection").innerText;
      const getCurrentEpisodes = () => [...episodesDomContainer.children];

      // Creates a JS object based on the HTML of the episodes.
      const getEpisodesObject = () =>
        getCurrentEpisodes().map((episodeDomElement) => {
          // The number of the episode.
          const number = episodeDomElement
            .querySelector(".overline")
            .innerText.split(" ")[1];

          // The title of the episode
          const title =
            episodeDomElement.querySelector(".v-card__title").innerText;

          return {
            season: getSelectedSeasonName(),
            number,
            title,
          };
        });

      // Generate JS Objects for all the episodes of the first
      // season of the anime.
      let episodes = getEpisodesObject();

      // It is necessery to click the season select and wait
      // a few milliseconds for the data of other possible
      // seasons to show in the DOM.
      seasonSelector.querySelector('[role="button"]').click();
      await sleep(300);

      // An array with all the seasons that are not loaded yet.
      // (Excludes the first season).
      const remainingSeasons = [
        ...document.querySelector(".v-select-list").children,
      ].slice(1);

      // Loop through the remaining seasons.
      for (let i = 0; i < remainingSeasons.length; i++) {
        const season = remainingSeasons[i];

        // Click on the current season option to make it load.
        season.click();

        const scrollDown = async () => {
          const height = document.body.scrollHeight;
          for (let i = 0; i <= (height - (height % 100)) / 100; i++) {
            scrollTo(0, (i + 1) * 100);
            await sleep(50);
          }
        };

        // Wait a few milliseconds for placeholders to appear
        // on screen, then start scrolling down the page, this
        // is necessery to make all the episodes load properly,
        // as they won't load if not in the screen.
        await sleep(200);
        await scrollDown();

        // When all the episodes have loaded there won't be
        // any placeholders in the DOM, so while there are
        // stil placeholders left, keep scrolling.
        while (document.querySelector(".v-skeleton-loader__image")) {
          await scrollDown();
        }

        // Finaly, when all the episodes have loaded, add
        // them at the end of the episodes array.
        episodes = [...episodes, ...getEpisodesObject()];
      }

      return {
        imageUrl,
        title,
        description,
        episodes,
      };
    } catch {
      return null;
    }
  });

  return data;
};

const crunchyroll = async (page, url) => {
  await page.goto(url, { waitUntil: "networkidle0" });

  const data = await page.evaluate(() => {
    try {
      // If there is any error being displayed by
      // crunchyroll, we can't get the data.
      if (document.querySelector(".error-text")) return null;

      // The image of the anime.
      const imageUrl = document.querySelector(".poster").src;
      // The title of the anime.
      const title = document.querySelector(".ellipsis span").innerText;
      // The description of the anime.
      const description = document.querySelector(".more").innerText.trim();

      // All of the seasons for this anime.
      const seasons = [...document.querySelector(".list-of-seasons").children];

      // Creates a JS object for episodes based on the HTML
      // for the seasons.
      const episodes = seasons.reduce((arr, seasonDomElement) => {
        // The name of the season.
        const season =
          seasonDomElement.querySelector(".season-dropdown").innerText;

        // Loops through the episodes of the current season
        const eps = [...seasonDomElement.querySelectorAll(".group-item")].map(
          (episodeDomElement) => {
            // The number of the episode.
            const number = episodeDomElement
              .querySelector(".series-title")
              .innerText.trim()
              .split(" ")[1];

            // The title of the episode.
            const title = episodeDomElement.querySelector("p").innerText.trim();

            return {
              season,
              number,
              title,
            };
          }
        );

        // Merges the episodes already converted with the
        // episodes converted in this cycle of the loop.
        return [...arr, ...eps];
      }, []);

      return {
        imageUrl,
        title,
        description,
        episodes,
      };
    } catch {
      return null;
    }
  });

  return data;
};

const getAnimeData = async (animeName) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const funimationUrl = generateFunimationUrl(animeName);
  const crunchyrollUrl = generateCrunchyrollUrl(animeName);

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

  await browser.close();

  console.log(crunchyrollData || funimationData);
  return crunchyrollData || funimationData;
};

module.exports = getAnimeData;
