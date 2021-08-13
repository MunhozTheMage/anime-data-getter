const getAnimeData = require("./serivces/getAnimeData");

module.exports = {
  getAnime: async (req, res) => {
    const animeName = req.params.animeName;

    const animeData = await getAnimeData(animeName);

    res.send(animeData);
  },
};
