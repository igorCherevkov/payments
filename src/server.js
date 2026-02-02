import "dotenv/config";

import { initDB } from "../db/init.js";
import app from "./app.js";
import { PORT } from "./constants/index.js";

await initDB();

app.listen(PORT, () => {
  console.log(`server started on port: ${PORT}`);
});
