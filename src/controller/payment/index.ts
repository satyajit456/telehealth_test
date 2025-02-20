import { setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import { ValidUserToken } from "../../services/auth";
import mongoose, { isValidObjectId } from "mongoose";
import { messages } from "../../language/eng";
import Payments from "../../models/payments";
import Appointments from "../../models/appointments";
import { IListQuery } from "../../interface/common";

const router = express.Router();

// Get Payments list
const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      limit = process.env.limit,
      page = 0,
      sortBy = "_id",
      sort = "desc",
      status = "true",
      search,
    }: IListQuery = req.query;

    const statusVal = status === "true";

    const searchQuery = search
      ? {
          paymentMethod: new RegExp(search, "i"),
          amount: new RegExp(search, "i"), // Adjust search fields as needed
        }
      : {};

    const result = await Payments.aggregate([
      { $match: { status: statusVal, ...searchQuery, ...req?.body } },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      {
        $facet: {
          count: [{ $group: { _id: null, count: { $sum: 1 } } }],
          data: [{ $skip: Number(page) * Number(limit) }, { $limit: Number(limit) }],
        },
      },
    ]);

    const count = result[0]?.count.length > 0 ? result[0].count[0].count : 0;
    res.send(setSuccess({ data: result[0].data, count }));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Create new Payments
const createPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let values = req.body;
    values.createdBy = req.tokenData._id;
    values.updatedBy = req.tokenData._id;

    const newPayments = await Payments.create(values);

    if (newPayments) {
      await Appointments.findOneAndUpdate(
        { _id: values.appointmentId },
        { $set: { paymentId: newPayments._id } },
        { new: true }
      );
    }

    return res.send(setSuccess({ status: true, data: newPayments }));
  } catch (error) {
    return res.status(400).send(setError(error || messages.failCall));
  }
};

// Get Payments Detail
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send(setError( messages.idRequired("Payments")));
    }

    const detail = await Payments.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "doctor_profiles",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      {
        $unwind: "$doctorDetails",
      },
      {
        $lookup: {
          from: "departments",
          localField: "doctorDetails.departmentId",
          foreignField: "_id",
          as: "departmentDetails",
        },
      },
      {
        $unwind: "$departmentDetails",
      },
      {
        $lookup: {
          from: "categories",
          localField: "doctorDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: "$categoryDetails",
      },
      {
        $project: {
          doctorId: 1,
          amount: 1,
          paymentMethod: 1,
          status: 1,
          date: 1,
          doctorDetails: {
            firstName: 1,
            lastName: 1,
            gender: 1,
            email: 1,
            experienceYears: 1,
          },
          departmentDetails: {
            name: 1,
            note: 1,
          },
          categoryDetails: {
            name: 1,
            note: 1,
          },
        },
      },
    ]);

    if (detail && detail.length > 0) {
      return res.send({ data: detail[0] });
    } else {
      return res.status(400).send(setError({ error: "Payments not found" }));
    }
  } catch (error) {
    return next(error);
  }
};

/* common routers */
router.get("/", ValidUserToken, getList);
router.post("/", ValidUserToken, createPayments);
router.get("/:id", ValidUserToken, getDetail);

export default router;
