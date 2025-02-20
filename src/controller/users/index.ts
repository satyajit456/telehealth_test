import express, { Response, Request, NextFunction } from "express";
import { Moment, ObjectId, setError, setSuccess } from "../../utils/global";
import { ValidUserToken } from "../../services/auth";
import Users from "../../models/users";
import { messages } from "../../language/eng";
import { Roles } from "../../models/common";
import DoctorProfile from "../../models/doctor_profiles";
import PatientProfile from "../../models/patient_profiles";
import { generateOTP } from "../../services/otpUtils";
import { activationEmail, passNotification } from "../../services/notification";
import mongoose, { isValidObjectId, Types } from "mongoose";
import bcrypt from "bcrypt";
import Appointments from "../../models/appointments";
import { IRole } from "../../interface/common";
const Joi = require("joi");

const router = express.Router();

// Validation schemas
const patientProfileSchema = Joi.object({
  dob: Joi.date(),
  gender: Joi.string(),
  bloodGroup: Joi.string(),
  detail: Joi.string(),
});

const doctorProfileSchema = Joi.object({
  dob: Joi.date().required(),
  gender: Joi.string().required(),
  bloodGroup: Joi.string().required(),
  experienceYears: Joi.number().required(),
  department: Joi.string().required(),
  category: Joi.string().required(),
  detail: Joi.string(),
});

interface IQuery {
  limit?: string | number;
  skip?: string | number;
  sortBy?: string;
  sort?: string;
  status?: string;
  search?: string;
  role?: string;
  roleType?: string;
}

// Get user insights
export const userInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
):Promise<any> => {
  try {
    const tokenData = req.tokenData;
    const { userId } = req.query;

    if (userId && !isValidObjectId(userId)) {
      return res.status(400).send(setError(messages.idRequired("User")));
    }

    const filter = {
      status: true,
      $or: [
        { doctorId: userId || tokenData?._id },
        { patientId: userId || tokenData?._id },
      ],
    };

    const currentWeekVisit = await Appointments.countDocuments({
      date: { $gte: new Date(), $lte: Moment().endOf("week").toDate() },
      ...filter,
    });
    const upComming = await Appointments.countDocuments({
      date: { $gte: new Date() },
      ...filter,
    });

    return res.send(setSuccess({ data: { currentWeekVisit, upComming } }));
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Get users list with pagination, search, and sorting
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const projection = {
    activatedToken: 0,
    password: 0,
    roles: 0,
    token: 0,
    resetToken: 0,
  };

  try {
    const { type } = req.params;
    const { _id } = req.tokenData;
    const {
      limit = process.env.limit,
      skip = 0,
      sortBy = "_id",
      sort = "desc",
      status = "true",
      search,
      role,
      roleType,
    }: IQuery = req.query;

    const statusVal = status === "true";
    const searchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {}; // Handle search query

    // Build filters based on the role and roleType
    const roleFilter = role ? { role: new ObjectId(role) } : {};
    const roleTypeFilter = roleType
      ? {
          $or: roleType.split(",").map((roleItem) => ({ role: roleItem })),
        }
      : {};

    // Combine all filters
    const typeFilter = type ? { role: type } : {};
    const notActiveUserFilter = _id
      ? { $nor: [{ _id: new ObjectId(_id.toString()) }] }
      : {};
    const filter = {
      status: statusVal,
      ...roleFilter,
      ...roleTypeFilter,
      ...notActiveUserFilter,
      ...typeFilter,
    };

    const projectionType = type
      ? { firstName: 1, lastName: 1, email: 1, phone: 1, status: 1 }
      : projection;

    const result = await Users.aggregate([
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "_id",
          as: "role",
          pipeline: [{ $match: { status: true } }, { $project: { role: 1 } }],
        },
      },
      { $unwind: "$role" },
      { $set: { role: "$role.role" } },
      {
        $match: { ...filter, ...req.body },
      },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      { $match: { ...searchQuery } },
      { $limit: Number(limit) },
      { $project: projectionType },
      {
        $facet: {
          count: [{ $group: { _id: null, count: { $sum: 1 } } }],
          data: [
            { $skip: Number(skip) },
            { $limit: Number(limit) },
            {
              $addFields: {
                fullName: { $concat: ["$firstName", " ", "$lastName"] },
              },
            },
          ],
        },
      },
    ]);

    const count = result[0].count.length > 0 ? result[0].count[0].count : 0;
    res.send({ data: result[0].data, count });
  } catch (error) {
    next(error);
  }
};

// Get user details by ID
export const getUsersDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
):Promise<any> => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.send({ error: "User ID is required" });
    }
    const user = await Users.findOne({ _id: userId });
    if (user) {
      const userDetails = await user.getUser(user._id);
      return res.send({ data: userDetails });
    }

    return res.status(400).send(setError(messages.userNotFound));
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Create new user
export const createUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
):Promise<any> => {
  try {
    const values = req.body;
    const {
      dob,
      gender,
      bloodGroup,
      detail,
      firstName,
      lastName,
      email,
      username,
      countryCode,
      phone,
      photo,
      password,
    } = values;
    const roleVal = values.role || values.user?.role;
    const roleId = isValidObjectId(roleVal)
      ? { _id: roleVal }
      : { role: roleVal };

    const role: IRole | null = await Roles.findOne({ $or: [roleId] });

    if (!role) {
      return res.status(400).send(setError("User Role does not exist"));
    }
    const isSubUser = role?.role === "doctor" || role?.role === "patient";

    const otp = await generateOTP();
    const otpExpires = new Date(Date.now() + 2 * 60 * 1000);
    const roleIdValue = role?._id;

    const user = {
      firstName,
      lastName,
      email,
      username,
      countryCode,
      phone,
      photo,
      otp,
      otpExpires,
      role: roleIdValue,
      password,
    };
    const profile = { dob, gender, bloodGroup, detail };

    if (isSubUser && !user) {
      return res.status(400).send(setError("User profile data missing"));
    }

    if (role?.role === "doctor") {
      const { error } = doctorProfileSchema.validate(profile);
      if (error) {
        return res.json(setError(error));
      }
    }
    if (role?.role === "patient") {
      const { error } = patientProfileSchema.validate(profile);
      if (error) {
        return res.json(setError(error));
      }
    }

    const newUser: any = await Users.create(user);

    let userData;
    if (role?.role === "doctor") {
      userData = await DoctorProfile.create({ ...profile, userId: newUser._id });
    }
    if (role?.role === "patient") {
      userData = await PatientProfile.create({
        ...profile,
        userId: newUser._id,
      });
    }

    await activationEmail(newUser); // Send activation email

    res.send({
      status: true,
      data: { ...newUser?._doc, [role?.role]: userData },
    });
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Update user
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
):Promise<any> => {
  try {
    const tokenData = req.tokenData;
    const userId = req.params.id;

    if (!isValidObjectId(userId)) {
      return res.status(400).send(setError(messages.idRequired("User")));
    }

    const updatedUser = await Users.findOneAndUpdate(
      { _id: userId },
      { $set: { ...req.body, updatedBy: tokenData._id } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).send(setError(messages.userNotFound));
    }

    if (userId !== tokenData._id) {
      const message = {
        notification: {
          title: "User Profile updated",
          body: "Your profile data was updated by an admin user",
        },
        data: {},
      };
      await passNotification(userId, message);
    }

    return res.send({ data: updatedUser, message: "success" });
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Change Password
export const ChangeUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
):Promise<any> => {
  try {
    const tokenData = req.tokenData;
    const { oldPassword, password } = req.body;
    const user: { password: string } | null = await Users.findOne(
      { _id: tokenData?._id },
      { password: 1 }
    );
    const match = await bcrypt.compare(oldPassword, user?.password || "");
    if (!match) {
      return res.status(400).send(setError(messages.InvalidOldPassword, 400));
    }
    const encryptedPassword = await bcrypt.hash(
      password,
      Number(process.env.saltRounds)
    );
    const updatedUser = await Users.findOneAndUpdate(
      { _id: tokenData?._id },
      { $set: { password: encryptedPassword, updatedBy: tokenData._id } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).send(setError(messages.userNotFound));
    }

    return res.send({ data: updatedUser, message: "success" });
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Delete user
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
):Promise<any> => {
  try {
    const userId = req.params.id;

    if (!isValidObjectId(userId)) {
      return res.status(400).send(setError(messages.idRequired("User")));
    }

    const result: {deletedCount:number} | null = {
      deletedCount: 0
    }; // await Users.deleteOne({ _id: userId });

    if (result?.deletedCount > 0) {
      return res.send(setSuccess("User Deleted"));
    } else {
      return res.status(400).send(setError("Unable to delete user, user may not exist"));
    }
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Define the user routes
router.get("/", ValidUserToken, getUsers);
router.get("/insights", ValidUserToken, userInsights);
router.get("/:type", ValidUserToken, getUsers);
router.get("/detail/:id", ValidUserToken, getUsersDetail);
router.post("/", createUsers);
router.put("/change-password", ValidUserToken, ChangeUserPassword);
router.put("/:id", ValidUserToken, updateUser);
router.delete("/:id", ValidUserToken, deleteUser);
router.put("/assign/:id", ValidUserToken, updateUser);

export default router;
