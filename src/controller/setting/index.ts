import { setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import Users from "../../models/users";
import { Roles } from "../../models/common";
import Appointments from "../../models/appointments";
import PatientProfile from "../../models/patient_profiles";
import DoctorProfile from "../../models/doctor_profiles";
import { ValidUserToken } from "../../services/auth";
import { IRole } from "../../interface/common";
import { Types } from "mongoose";
import { messages } from "../../language/eng";

const router: any = express.Router();

// Get Dashboard Info
const getDashboardInfo = async (req: Request, res: Response, next: NextFunction) => {
  const projection = {
    __v: 0,
    doctorId: 0,
    patientId: 0,
    createdBy: 0,
    updatedBy: 0,
    createdAt: 0,
    updatedAt: 0,
    paymentId: 0,
    reason: 0,
  };

  try {
    const patientCount = await PatientProfile.countDocuments({ status: true });
    const doctorCount = await DoctorProfile.countDocuments({ status: true });
    const roles = await Roles.find({ $or: [{ role: 'admin' }, { role: 'staff' }] });
    const staffCount = await Users.countDocuments({
      status: true,
      $or: roles.map((v:any) => ({ role: v?._id }))
    });
    const appointmentCount = await Appointments.countDocuments({ status: true });

    const appointments = await Appointments.aggregate([
      { $match: { status: true } },
      { $limit: 5 },
      {
        $lookup: {
          from: "doctor_profiles",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorId",
          pipeline: [{ $project: { userId: 1 } }]
        }
      },
      { $unwind: "$doctorId" },
      {
        $lookup: {
          from: "users",
          localField: "doctorId.userId",
          foreignField: "_id",
          as: "doctor",
          pipeline: [{ $project: { name: 1, email: 1, _id: 1 } }]
        }
      },
      { $unwind: "$doctor" },
      {
        $lookup: {
          from: "patient_profiles",
          localField: "patientId",
          foreignField: "_id",
          as: "patientId",
          pipeline: [{ $project: { userId: 1 } }]
        }
      },
      { $unwind: "$patientId" },
      {
        $lookup: {
          from: "users",
          localField: "patientId.userId",
          foreignField: "_id",
          as: "patient",
          pipeline: [{ $project: { name: 1, email: 1, _id: 1 } }]
        }
      },
      { $unwind: "$patient" },
      { $project: projection },
    ]);

    res.send(setSuccess({ data: { patientCount, doctorCount, staffCount, appointmentCount, appointments }}));
  } catch (error) {
    // console.error(error);
    res.status(400).send(setError(error));
  }
};

// Get User List
const getUserList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, search } = req.query;
    const role: IRole | null = await Roles.findOne({ role: type });

    if (!role) {
      return res.status(400).send(setError(messages.roleNotExist));
    }

    let filter: { status: boolean, role?: string | Types.ObjectId, $or?: any[] } = { status: true };
    if (role._id) {
      filter.role = role._id;
    }

    if (search) {
      filter.$or = [
        { name: { '$regex': search, '$options': 'i' } },
        { email: { '$regex': search, '$options': 'i' } },
        { phone: { '$regex': search, '$options': 'i' } },
        { fullname: { '$regex': search, '$options': 'i' } }
      ];
    }

    let profileData: any[] = [];
    if (role.role === "doctor") {
      profileData = [
        { $lookup: { from: "doctor_profiles", localField: "_id", foreignField: "userId", as: "doctorId" } },
        { $unwind: "$doctorId" },
        {
          $set: {
            workingDays: "$doctorId.workingDays",
            breakTime: "$doctorId.breakTime",
            consultTime: "$doctorId.consultTime",
            doctorId: "$doctorId._id"
          }
        }
      ];
    }
    if (role.role === "patient") {
      profileData = [
        { $lookup: { from: "patient_profiles", localField: "_id", foreignField: "userId", as: "patientId" } },
        { $unwind: "$patientId" },
        { $set: { patientId: "$patientId._id" } },
      ];
    }

    const profileId = role.role === "patient" ? { patientId: 1 } : { doctorId: 1, workingDays: 1, breakTime: 1, consultTime: 1 };

    const data = await Users.aggregate([
      { $match: filter },
      ...profileData,
      { $limit: 50 },
      { $project: { name: 1, email: 1, status: 1, ...profileId } },
    ]);

    res.send(setSuccess({ data }));
  } catch (error) {
    res.status(400).send(setError(error));
    
  }
};

/* common routers */
router.get("/dashboard", ValidUserToken, getDashboardInfo);
router.get("/users", ValidUserToken, getUserList);

export default router;