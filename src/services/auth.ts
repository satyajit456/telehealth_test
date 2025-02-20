import Users from "../models/users";
import jwt from "jsonwebtoken";
import { messages } from "../language/eng";
import mongoose from "mongoose";
import {
  Moment,
  sessionTimeOut,
  setError,
  strictValidObject,
  validValue,
} from "../utils/global";
import { NextFunction, Response, Request } from "express";

const jwtSecretKey: string = process.env.JWT_SECRET_KEY || "";

// Update user's last login time
export const UpdateLastLogin = async (
  _id: string | mongoose.Schema.Types.ObjectId
) => {
  try {
    return await Users.updateOne(
      { _id },
      { lastLogin: new Date(), resetToken: "", activatedToken: "", otp: "" }
    );
  } catch (e) {
    throw new Error("Error updating last login");
  }
};

// Generate JWT token with optional expiration time (default to sessionTimeOut)
export const generateJWTToken = async (
  user: { username: any; email: any; _id: any },
  expTime = sessionTimeOut
) => {
  try {
    const { email, _id } = user; // username
    const data = { email, _id };
    const token = await jwt.sign(data, jwtSecretKey); // { expiresIn: expTime } // if you want to add token session timeout
    return token;
  } catch (e) {
    return e;
  }
};

// Verify JWT token and return the decoded data
export const verifyJWTToken = async (token: string) => {
  try {
    const verified = await jwt.verify(token, jwtSecretKey);
    return verified;
  } catch (e) {
    return messages.InvalidToken;
  }
};

// Middleware to validate JWT token and check session timeout
export async function ValidUserToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  const token: string =
    req.header("authorization")?.replace("Bearer ", "") || "";

  if (!validValue(token) || token === "null") {
    return res.status(400).send(setError(messages.TokenRequired, 401));
  }
  try {
    const verifiedToken: any = await verifyJWTToken(token);

    if (strictValidObject(verifiedToken)) {
      const userDetail: any = await Users.findOne({ _id: verifiedToken._id });
      if (!userDetail) {
        return res.status(401).send(setError(messages.InvalidToken, 401));
      }

      const diff = Moment(new Date()).diff(
        Moment(userDetail.lastLogin),
        process.env.session_timeout_type
      );

      // Check if the session is still valid based on the configured session timeout
      if (diff < Number(process.env.session_timeout_time)) {
        await UpdateLastLogin(verifiedToken._id);
        req.tokenData = verifiedToken;

        return next();
      }
    }

    return res.status(401).send(setError(messages.InvalidToken, 401));
  } catch (e) {
    res.status(400).send(setError(e));
  }
}
