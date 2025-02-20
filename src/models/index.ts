import mongoose, { Connection } from "mongoose";
import { MongoCron } from "mongodb-cron";
import * as Fs from "fs";
import * as Path from "path";
import { setError } from "../utils/global";
const project_name = process.env.projectName || "new-project";
const dbUrl = process.env.db_url || `mongodb://localhost:27017/${project_name}`;
// 0.0.0.0:27017
// const { processCron } = require('../services/cronServices');

interface Db {
  mongoose: Connection;
  [key: string]: any; // Allows dynamic model names
}
const db: Db = {} as Db;
const options: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 50000, // Timeout for server selection (50 seconds)
  connectTimeoutMS: 100000, // Timeout for connection establishment (100 seconds)
};

const connectToDatabase = async () => {
  try {
    await mongoose.connect(dbUrl, options);
    console.log('Successfully connected to MongoDB!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};
connectToDatabase();
// const run = async () => await mongoose.connect(dbUrl, options);
// run().catch((e:any) => console.log(setError(e)));


// mongoose
//   .connect(dbUrl, {useNewUrlParser: true, useUnifiedTopology: true,})
//   .catch((e:any) => console.log(setError(e)));
const mongodb:any = mongoose.connection;

mongodb.on("error", console.error.bind(console, "connection error"));

mongodb.once("open", function () {
  console.log("open connection");
});

try {
  Fs.readdirSync(__dirname)
    .filter(function (file) {
      return file.indexOf(".") !== 0 && file !== "index.ts";
    })
    .forEach(function (file) {
      var filename = file.split(".")[0];
      var model = require(Path.join(__dirname, file));
      db[filename] = model;
    });

  const collection = mongodb.collection("crons");

  mongodb.cron = new MongoCron({
    collection,
    nextDelay: 10,
    idleDelay: 10,
    // condition: {tenant: ObjectId(tenant._id)},
    onDocument: async (doc) => {
      //  console.log('doc--', doc)
      //  processCron(doc);
    }, // triggered on job processing
    onError: async (err) => console.log(err), // triggered on error
  });
  // mongodb.cron.start();
} catch (err) {
  console.log("errrr", err);
}

db.mongoose = mongodb;
export default db;
