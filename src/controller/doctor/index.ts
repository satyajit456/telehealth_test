import express, { Response, Request, NextFunction } from "express";
import { ValidUserToken } from "../../services/auth";
import DoctorProfile from "../../models/doctor_profiles";
import { Types } from "mongoose";
import { isValidObjectId, setError, setSuccess } from "../../utils/global";
import Users from "../../models/users";
import { Roles } from "../../models/common";
import { IRole } from "../../interface/common";
import { doctorList } from "./services";
import { messages } from "../../language/eng";

const router = express.Router();

// get Doctor Profile list
const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await doctorList({
      currentuserId: req.tokenData._id,
      query: req.query,
      body: req.body,
    });
    res.send(setSuccess(data));
  } catch (error) {
    res.status(400).send(setError(error));
  }
};

export const findDoctorProfile = async (id: string) =>
  await DoctorProfile.aggregate([
    {
      $match: {
        $or: [
          { _id: new Types.ObjectId(id) },
          { userId: new Types.ObjectId(id) },
        ],
      }, // Match the doctor by doctorId
    },
    {
      $lookup: {
        from: "users", // The user collection
        localField: "userId", // Field in the doctor collection
        foreignField: "_id", // Field in the user collection
        as: "user", // The alias for the populated user data
        pipeline: [
          // {$match: {status: true}},
          {
            $project: {
              // role: 0,
              activatedToken: 0,
              otp: 0,
              otpExpires: 0,
              updatedAt: 0,
              createdAt: 0,
              password: 0,
              resetToken: 0,
              lastLogin: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: "$user", // Flatten the userDetails array
    },
    {
      $lookup: {
        from: "departments", // The department collection
        localField: "department", // Field in the doctor collection
        foreignField: "_id", // Field in the department collection
        as: "department", // The alias for the populated department data
        pipeline: [
          // {$match: {status: true}},
          {
            $project: {
              name: 1,
              note: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$department", // Flatten the departmentDetails array
    },
    {
      $lookup: {
        from: "categories", // The category collection
        localField: "category", // Field in the doctor collection
        foreignField: "_id", // Field in the category collection
        as: "category", // The alias for the populated category data
        pipeline: [
          // {$match: {status: true}},
          {
            $project: {
              name: 1,
              note: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$category", // Flatten the categoryDetails array
    },
    {
      $project: {
        createdAt: 0,
        updatedAt: 0,
        __v: 0,
        updatedBy: 0,
      },
    },
  ]);

// Get Doctor Profile Detail
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("DoctorProfile")));
    }

    const detail = await findDoctorProfile(id);

    if (detail) {
      delete detail[0]?.user?.userId;
      const data = {
        ...detail[0],
        doctorId: detail[0]?._id,
        ...detail[0]?.user,
      };
      delete data.user;
      return res.send(setSuccess({ data }));
    } else {
      return res.status(400).send(setError(messages.notFound));
    }
  } catch (error) {
    res.status(400).send(setError(error));
  }
};

// Update DoctorProfile
const updateDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const tokenData: any = req.tokenData;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Doctor Profile")));
    }

    const {
      dob,
      gender,
      bloodGroup,
      experienceYears,
      detail,
      breakTime,
      workingDays,
      consultTime,
      category,
      department,
      consultationFee,
      specialization,
      role,
      ...rest
    } = req.body;

    const roleId = isValidObjectId(role) ? { _id: role } : { role: role };
    const roleObject: IRole | null = await Roles.findOne({ $or: [roleId] });

    const user = { ...rest, role: roleObject?._id };
    const profile = {
      dob,
      gender,
      bloodGroup,
      experienceYears,
      detail,
      breakTime,
      workingDays,
      consultTime,
      category,
      department,
      consultationFee,
      specialization,
    };

    const updated: { _doc: any; userId: Types.ObjectId | string } | null =
      await DoctorProfile.findOneAndUpdate(
        {
          $or: [
            { _id: new Types.ObjectId(id) },
            { userId: new Types.ObjectId(id) },
          ],
        },
        { $set: { ...profile, updatedBy: tokenData._id } },
        { new: true }
      );

    const updatedUser: { _doc: any; userId: Types.ObjectId | string } | null =
      await Users.findOneAndUpdate(
        { _id: updated?.userId },
        { $set: { ...user } },
        { new: true }
      );

    if (!updated) {
      return res.status(400).send(setError("Doctor Profile not found"));
    }

    const data = {
      ...updated?._doc,
      doctorId: updated?._doc?._id,
      ...updatedUser?._doc,
    };

    [
      "createdAt",
      "updatedAt",
      "__v",
      "password",
      "otp",
      "otpExpires",
      "activatedToken",
      "resetToken",
    ].forEach((v) => delete data[v]);

    return res.send(setSuccess({ data }));
  } catch (error) {
    res.status(400).send(setError(error));
  }
};

/* common routers */
router.get("/", ValidUserToken, getList);
router.get("/:id", ValidUserToken, getDetail);
router.put("/:id", ValidUserToken, updateDoctorProfile);

export default router;
