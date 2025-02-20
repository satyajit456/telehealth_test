import express, { Response, Request, NextFunction } from "express";
import Users from "../../models/users";
import { messages } from "../../language/eng";
import {
  generateJWTToken,
  UpdateLastLogin,
  ValidUserToken,
  verifyJWTToken,
} from "../../services/auth";
import { forgotPasswordEmail } from "../../services/notification";
import bcrypt from "bcrypt";
import { setError, setSuccess, strictValidString } from "../../utils/global";
import { generateOTP, verifyOTP } from "../../services/otpUtils";
import { verifyGoogleToken } from "../../services/socialAuth";
import { Roles } from "../../models/common";
import DoctorProfile from "../../models/doctor_profiles";
import PatientProfile from "../../models/patient_profiles";
import { findExistUser } from "./services";
import { IRole, IUsers } from "../../interface/common";

const router = express.Router();

// User Login
const getLoginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { email, password } = req.body;
    const user: IUsers | null = await findExistUser(email);

    if (!user || password) {
      return res.status(400).send(setError(messages.InvalidUser, 400));
    }

    if (!user.isActivated) {
      return res.status(400).send(setError(messages.inActiveUser, 400));
    }

    const match = await bcrypt.compare(password, user.password || "");
    if (!match) {
      return res.status(400).send(setError(messages.InvalidPassword, 400));
    }
    await UpdateLastLogin(user?._id.toString());
    const token = await generateJWTToken(user);
    res.send(setSuccess({ data: user, token }));
  } catch (e) {
    res.status(400).send(setError(e instanceof TypeError ? messages.InvalidValues : e));
  }
};

// User Logout
const getLogoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // const tokenData = req.tokenData;
    return res.send(setSuccess(null, null, messages.successLogout));
  } catch (e) {
    res.status(400).send(setError(e));
  }
};

// Check user token valid or not
const getValidateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { token = "" } = req.query;
    const verified = await verifyJWTToken(token.toString());
    const { email, _id }: any = verified;
    return res.send(setSuccess({ email, _id }));
  } catch (e) {
    res.status(400).send(setError(e instanceof TypeError ? messages.InvalidToken : e));
  }
};

// Activate Account by link
const setActivateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { token, password } = req.body;
    const encryptedPassword = await bcrypt.hash(
      password,
      Number(process.env.saltRounds)
    );
    const verified: any = await verifyJWTToken(token);
    const userData: any = await Users.findOne({ _id: verified._id });
    if (!userData) {
      return res.status(400).send(setError(messages.InvalidToken));
    }
    if (strictValidString(verified)) {
      return res.status(400).send(setError(verified));
    }
    const user = await Users.findOneAndUpdate(
      { _id: verified._id, activatedToken: token },
      {
        $set: {
          password: encryptedPassword,
          activatedToken: "",
          otp: "",
          otpExpires: "",
          isActivated: true,
        },
      },
      { returnNewDocument: true, new: true }
    );

    if (!user) {
      return res.status(400).send(setError(messages.InvalidToken));
    }

    res.send(setSuccess(user, null, "Successfully activated account"));
  } catch (e) {
    res.status(400).send(setError(e instanceof TypeError ? "Enter valid data" : e));
  }
};

const setResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { token, password } = req.body;
    const encryptedPassword = await bcrypt.hash(
      password,
      Number(process.env.saltRounds)
    );
    const updatedUser = await Users.findOneAndUpdate(
      { resetToken: token },
      { $set: { password: encryptedPassword, resetToken: "" } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).send(setError(messages.InvalidToken));
    }
    res.send(setSuccess(null, null, "Password reset successfully"));
  } catch (e) {
    res.status(400).send(setError(e instanceof TypeError ? "Enter valid data" : e));
  }
};

const setForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { values, type } = req.body;
    const userData: any = await Users.findOne({ [type]: values });

    if (!userData) {
      return res.status(400).send(setError(messages.InvalidValues));
    }

    const resetToken = await bcrypt.hash(
      userData._id.toString(),
      Number(process.env.saltRounds)
    );
    const data = {
      otp: await generateOTP(),
      otpExpires: new Date(Date.now() + 2 * 60 * 1000),
    };
    await Users.findOneAndUpdate(
      { [type]: values },
      { $set: { resetToken: resetToken.replaceAll("/", "_"), ...data } },
      { new: true }
    );

    await forgotPasswordEmail({
      ...userData._doc,
      resetToken: resetToken.replaceAll("_", "/"),
      ...data,
    });
    res.send(setSuccess({ values, type }, null, messages.forgotPassword));
  } catch (e) {
    res.status(400).send(setError(e instanceof TypeError ? "Enter valid data" : e));
  }
};

// OTP Process
// Activate Account by link
const validateOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let { otp, email } = req.body;
    const user: {
      otp: number;
      otpExpires: number;
      activatedToken: string;
      resetToken: string;
      _id: object;
    } | null = await Users.findOne({ email });

    if (!user) return res.status(400).send(setError("user not exist"));
    const isValid = await verifyOTP(otp, user?.otp, user?.otpExpires);
    if (isValid) {
      await Users.findOneAndUpdate(
        { _id: user._id },
        { $set: { otp: "", otpExpires: "", isActivated: true } }
      );
      // user.activatedToken ||
      res.send(setSuccess({ token: user.resetToken }, null, "Verifyed"));
    } else {
      return res.status(400).send(setError("Invalid OTP"));
    }
  } catch (e) {
    // console.log(e);
    res.status(400).send(setError(e instanceof TypeError ? "Enter valid OTP" : e));
  }
};

const reGenerateOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(400).send(setError("User not found"));
    }
    if (!user.activatedToken) {
      return res.status(400).send(setError("User already activate. Please forgot your password"));
    }

    const otp = await generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    await Users.findOneAndUpdate(
      { _id: user._id },
      { $set: { otp, otpExpires } },
      { new: true }
    );

    res.send(setSuccess(null, null, "Please check your email for new OTP"));
  } catch (e) {
    res.status(400).send(setError(e instanceof TypeError ? "Enter valid data" : e));
  }
};

// Social Login/Register
export const socialAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { type } = req.params;
    const { token = "", role = "", ...restData }: any = req.body;
    let data: any;
    if (type === "google" && typeof token === "string") {
      data = await verifyGoogleToken(token); // google access_token
    }

    if (!data?.email) {
      return res.status(400).send(setError("Invalid Google token", 400));
    }

    const user: IUsers | null = await findExistUser(data.email);

    let newUser: any;
    if (!user) {
      const { email } = data;
      const values: any = { email, ...restData };

      const userRole: IRole | null = await Roles.findOne({ role: role });
      if (!userRole) {
        return res.status(400).send(setError("User Role not exist"));
      }
      const isSubUser = role.role === "doctor" || role.role === "patient";
      if (isSubUser) {
        values.user.role = userRole?._id;
      } else {
        values.role = userRole?._id;
      }

      let { user, ...rest } = values;

      const newUserData = new Users(isSubUser ? user : rest);
      newUser = await newUserData.save({ validateBeforeSave: false });

      try {
        const data = isSubUser ? rest : user;
        if (role.role === "doctor") {
          const newDoctorData = new DoctorProfile({
            ...data,
            userId: newUser._id,
          });
          await newDoctorData.save({ validateBeforeSave: false });
        }
        if (role.role === "patient") {
          const newPatientData = new PatientProfile({
            ...data,
            userId: newUser._id,
          });
          await newPatientData.save({ validateBeforeSave: false });
        }
      } catch (err) {
        await Users.deleteOne({ _id: newUser._id });
        return res.status(400).send(setError(err || messages.failCall));
      }

      delete newUser.createdAt;
      delete newUser.updatedAt;
      delete newUser.activatedToken;
    }

    const tokenString = await generateJWTToken(newUser || user);
    res.send(setSuccess({ data: newUser || user, token: tokenString }));
  } catch (e) {
    // console.log('e----', e)
    res.status(400).send(setError(e instanceof TypeError ? "Enter valid data" : e));
  }
};

/* auth routers */
router.post("/login", getLoginUser);
router.post("/activate-account", setActivateAccount);
router.post("/reset-password", setResetPassword);
router.post("/forgot-password", setForgotPassword);
router.get("/validate-token", getValidateToken);
router.get("/logout", ValidUserToken, getLogoutUser);

// OTP Process
router.post("/otp", validateOTP);
router.post("/otp/resend", reGenerateOtp);

router.post("/:type/login", socialAuth);

export default router;
