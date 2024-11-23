

import "dotenv/config"
// console.log(process.env) 

import connectDB from "./db/index.js";
import { app } from "./app.js";

console.log("server init");

connectDB()
  .then(() => {
    app.on("error: ", (error) => {
      console.log("error: ", error);
      process.exit(1);
    });
    app.listen(process.env.PORT || 7000, () => {
      console.log(`App is listening on Port : `, process.env.PORT || 7000);
    });
  })
  .catch((error) => {
    console.log("MONGO_DB connection failed : ", error);
    process.exit(1);
  });