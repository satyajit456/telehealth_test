import express, { Response, Request, NextFunction } from "express";
import { ValidUserToken } from "../../services/auth";
import PatientProfile from "../../models/patient_profiles";
import mongoose, { isValidObjectId, Types } from "mongoose";
import { ObjectId, setError, setSuccess } from "../../utils/global";
import Users from "../../models/users";
import { Roles } from "../../models/common";
import { IListQuery, IRole } from "../../interface/common";
import { messages } from "../../language/eng";

const router = express.Router();
// get Patient Profile list
const getList = async (req: Request, res: Response, next: NextFunction) => {
  const projection = {
    dob:1,
    status: 1,
    gender: 1,
    bloodGroup: 1,
    Paritent_id:1,
    firstName: "$user.firstName",
    lastName: "$user.lastName",
    name: "$user.name",
    email: "$user.email",
    detail: 1,
    userId:1,    
    photo: "$user.photo",
    username: "$user.username",
  };
  try {
    const {
      limit = Number(process.env.LIMIT) || 10,
      page = 0,
      sortBy = "_id",
      sort = "desc",
      status = "true",
      search = "",
    }: IListQuery = req.query;
    const statusVal: boolean = status === "true";

    const searchQuery = search
      ? {
          $or: [
            { "user.firstName": { $regex: search, $options: "i" } },
            { "user.lastName": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { "user.name": { $regex: search, $options: "i" } },
            { "user.gender": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const result = await PatientProfile.aggregate([
      {
        $lookup: {
          from: "users", 
          localField: "userId", 
          foreignField: "_id", 
          as: "user", 
          pipeline: [
            { $match: { status: true } },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                email: 1,
                name: 1,
                photo: 1,
                username: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      { $project: { ...projection } },
      { $match: { status: statusVal, ...searchQuery, ...req?.body } },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      {
        $facet: {
          count: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          data: [
            { $skip: Number(page) * Number(limit) },
            { $limit: Number(limit) },
          ],
        },
      },
    ]);

    let count =
      result[0].count.length > 0 && result[0].count[0].count
        ? result[0].count[0].count
        : 0;
    res.send(setSuccess({ data: result[0].data, count }));
  } catch (error) {
    res.status(400).send(setError(error));
  }
};

export const findPatientProfile = async (id:string) => await PatientProfile.aggregate([
  {
    $match: { $or:[{_id: new mongoose.Types.ObjectId(id)}, {userId: new mongoose.Types.ObjectId(id)}]  }, // Match the patient by patientId
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
            updatedAt:0,
            createdAt:0,
            password:0,
            resetToken:0,
            lastLogin:0,
          },
        },
      ],
    },
  },
  {
    $unwind: "$user", // Flatten the userDetails array
  },
  {
    $project: {
      createdAt:0,
      updatedAt:0,
      __v: 0,
      updatedBy:0,
    },
  },
]);

// Get Patient Profile Detail
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Patient")));
    }

    const detail = await findPatientProfile(id);

    if (detail && detail.length > 0) {
      const data = { ...detail[0], patientId: detail[0]._id, ...detail[0].user };
      delete data.user;
      return res.send(setSuccess({ data }));
    } else {
      return res.status(400).send(setError(messages.notFound));
    }
  } catch (error) {
    next(error); 
  }
};

// Update PatientProfile
const updatePatientProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const tokenData = req.tokenData;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Patient")));
    }

    const { dob, gender, bloodGroup, appointments, detail, likedDoctors, role, ...rest } = req.body;
    const roleId = mongoose.Types.ObjectId.isValid(role) ? { _id: role } : { role: role };
    const roleObject: IRole | null = await Roles.findOne({ $or: [roleId] });

    const user = {...rest, role: roleObject?._id};
    const profile = {dob, gender, bloodGroup, appointments, detail, likedDoctors};

    const updatedProfile: { _doc: any; userId: Types.ObjectId | string } | null  = await PatientProfile.findOneAndUpdate(
      { $or: [{ _id: new ObjectId(id) }, { userId: new mongoose.Types.ObjectId(id) }] },
      { $set: { ...profile, updatedBy: tokenData._id } },
      { new: true }
    );

    const updatedUser: { _doc: any;} | null  = await Users.findOneAndUpdate({ _id: updatedProfile?.userId }, { $set: { ...user } }, { new: true });

    if (!updatedProfile) {
      return res.status(400).send(setError(messages.notFound));
    }

    const data = { ...updatedProfile?._doc, patientId: updatedProfile?._doc?._id, ...updatedUser?._doc };
    ['createdAt', 'updatedAt', '__v', 'password', 'otp', 'otpExpires', 'activatedToken', 'resetToken'].forEach((v) => delete data[v]);

    return res.send(setSuccess({ data }));
  } catch (error) {
    next(error); 
  }
};

/* common routers */
router.get("/", ValidUserToken, getList);
router.get("/:id", ValidUserToken, getDetail);
router.put("/:id", ValidUserToken, updatePatientProfile);

export default router;
