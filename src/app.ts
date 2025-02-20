import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from 'cors';
import 'dotenv/config'
import indexRouter from "./routes/index";
import usersRouter from "./routes/users";
import Routes from './controller';

declare global {
  namespace Express {
      interface Request {
        tokenData?: any;
      }
  }
}

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");


const corsOptions = {
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type','Authorization', 'portal'],
  credentials: true,
};
// corsOptions
app.use(cors(corsOptions)); // Apply CORS to all API routes

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// app.use(express.static(path.join(__dirname, "../public")));

import "./models";
// import mongoose from "mongoose";
app.use("/", indexRouter);
app.use("/users-text", usersRouter);
// connect controllers
// require("./controller")(app);
Routes(app);

app.use(function (req: Request, res: Response, next: NextFunction) {
  const error = new Error("Not Found");
  next(error);
});


app.use(function (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

export default app;
