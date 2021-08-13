const express = require("express");
const app = express();

const { getAnime } = require("./src/anime");

const animeRouter = express.Router();

animeRouter.route("/:animeName").get(getAnime);

app.use("/anime", animeRouter);

app.listen(3007, () => {
  console.log("Running!!!");
});
