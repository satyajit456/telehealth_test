import { ObjectId, setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import { messages } from "../../language/eng";
import { ValidUserToken } from "../../services/auth";
import Feedback from "../../models/feedback";
// import { io } from "../../services/socketIo";
// import Users from "../../models/users";
import DoctorProfile from "../../models/doctor_profiles";
import {
  IFeedback,
  IFeedbackAggResult,
  IListQuery,
} from "../../interface/common";

const router = express.Router();

//  Create a new feedback or get existing feedback
const createFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { feedbackBy, feedbackTo, appointmentId } = req.body;

    if (!feedbackBy || !feedbackTo) {
      return res.status(400).send(setError("Key value missing"));
    }

    let values: IFeedback = req.body;
    values.feedbackId = `${values.feedbackTo}-${values.appointmentId}`;

    const newFeedback = await Feedback.create(values);

    const ratting: IFeedbackAggResult[] = await Feedback.aggregate([
      {
        $match: { feedbackTo: new ObjectId(feedbackTo.toString()) },
      },
      {
        $group: {
          _id: "$feedbackTo",
          totalRatings: { $sum: "$rating" },
          count: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    if (ratting[0].count > 0) {
      try {
        await DoctorProfile.updateOne(
          { userId: feedbackTo },
          {
            $set: {
              rating: ratting[0].averageRating || 0,
              totalFeedback: ratting[0].count,
            },
          }
        );
      } catch (err: unknown) {
        return res.status(400).send(setError(err || messages.failCall));
      }
    }

    return res.send(setSuccess({ data: newFeedback }, "new"));
  } catch (error: unknown) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Get feedback message list
const getList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const projection = {
    __v: 0,
    updatedAt: 0,
    feedbackTo: 0,
    appointmentId: 0,
  };

  try {
    const tokenData: any = req.tokenData;
    const { id }: { id?: string } = req.params;
    const {
      limit = Number(process.env.LIMIT) || 10,
      page = 0,
      sortBy = "_id",
      sort = "desc",
      status = "true",
      search = "",
    }: IListQuery = req.query;

    const statusVal = status === "true";
    const searchQuery = search
      ? {
          $or: [
            { "feedbackTo.name": { $regex: search, $options: "i" } },
            { "feedbackBy.name": { $regex: search, $options: "i" } },
            { feedbackText: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const result = await Feedback.aggregate([
      { $match: { feedbackTo: new ObjectId(id || tokenData._id.toString()) } },
      // {
      //     $lookup: {
      //         from: "users", // The name of the user collection in MongoDB
      //         localField: "feedbackTo", // Field in the doctor collection
      //         foreignField: "_id", // Field in the user collection
      //         as: "feedbackTo", // Alias for the resulting merged data
      //         pipeline: [
      //             { $match: { status: true } },
      //             {
      //                 $project: {
      //                 // firstName: 1,
      //                 // lastName: 1,
      //                 name: 1,
      //                 },
      //             },
      //         ],
      //     },
      // },
      // {
      // $unwind: "$feedbackTo", // Flatten the userDetails array
      // },
      {
        $lookup: {
          from: "users",
          localField: "feedbackBy",
          foreignField: "_id",
          as: "feedbackBy",
          pipeline: [
            { $match: { status: true } },
            {
              $project: {
                name: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$feedbackBy" },
      { $match: { status: statusVal, ...searchQuery } },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      { $project: projection },
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

    const count = result[0].count.length > 0 ? result[0].count[0].count : 0;
    res.send(setSuccess({ data: result[0].data, count }));
  } catch (error: unknown) {
    res.status(400).send(setError(error));
  }
};

// Delete Feedback (Placeholder implementation)
const deletefeedbackMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    return res.status(400).send(setError("Unable to delete Feedback"));
  } catch (error: unknown) {
    res.status(400).send(setError(error));
  }
};

// Common routers
router.post("/", ValidUserToken, createFeedback);
router.get("/", ValidUserToken, getList);
router.get("/:id", ValidUserToken, getList);
router.delete("/:id", ValidUserToken, deletefeedbackMessage);

export default router;
