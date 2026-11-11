const app = require("./app");
const { ensureAdminUser } = require("./config/seedAdmin");

const PORT = process.env.PORT || 5000;

  app.listen(PORT, async () => {
    console.log(`NexTo API running on port ${PORT}`);
    await ensureAdminUser();
  });
