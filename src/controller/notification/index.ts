import express, { Response, Request, NextFunction } from "express";
import { ValidUserToken } from "../../services/auth";
import mongoose, { isValidObjectId } from "mongoose";
import { ObjectId, setError, setSuccess } from "../../utils/global";
import Users from "../../models/users";
import Notifications from "../../models/notifications";
import { sendNotification } from "../../services/notification";
import { IListQuery, INotifications } from "../../interface/common";
import { DeviceToken } from "../../models/common";
import { messages } from "../../language/eng";

const router = express.Router();

// get Notification list
const getList = async (req: Request, res: Response, next: NextFunction) => {
  const projection = {
    __v: 0,
  };
  try {
    const { _id } = req.tokenData;
    const { userId } = req.params;
    const {
      limit = Number(process.env.LIMIT) || 10,
      page = 0,
      sortBy = "_id",
      sort = "desc",
      status = "true",
      search = "",
    }: IListQuery = req.query;

    const statusVal = status === "true";

    // Handle search query
    const searchQuery = search
      ? {
          $or: [
            { type: { $regex: search, $options: "i" } },
            { subject: { $regex: search, $options: "i" } },
            { body: { $regex: search, $options: "i" } },
            { notificationType: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const match =
      _id || userId ? { userId: new ObjectId(userId || _id.toString()) } : {};
    // console.log(_id, userId, match);

    const result = await Notifications.aggregate([
      { $match: match },
      { $project: { ...projection } },      
      { $match: { status: statusVal, ...searchQuery, ...req?.body } },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      {
        $facet: {
          count: [{ $group: { _id: null, count: { $sum: 1 } } }],
          data: [
            { $skip: Number(page) * Number(limit) },
            { $limit: Number(limit) },
          ],
        },
      },
    ]);

    const count = result[0].count.length > 0 ? result[0].count[0].count : 0;
    res.send(setSuccess({ data: result[0].data, count }));
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
};

// Get Notification Detail
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Notification")));
    }

    //await Notifications.findOne({ _id: id });
    const detail = await Notifications.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                role: 0,
                activatedToken: 0,
                otp: 0,
                otpExpires: 0,
                updatedAt: 0,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "department",
          pipeline: [{ $project: { name: 1, note: 1 } }],
        },
      },
      { $unwind: "$department" },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1, note: 1 } }],
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          doctorId: 1,
          dob: 1,
          gender: 1,
          status: 1,
          experienceYears: 1,
          workingHours: 1,
          daysOff: 1,
          userId: 1,
          user: 1,
          department: 1,
          category: 1,
          bloodGroup: 1,
        },
      },
    ]);

    if (detail && detail.length > 0) {
      return res.send(setSuccess({ data: detail[0] }));
    } else {
      return res.status(400).send(setError(messages.notFound));
    }
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Update DoctorProfile
const updateDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const tokenData = req.tokenData;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Notification")));
    }

    const { user, ...rest } = req.body;
    const updated: INotifications | null = await Notifications.findOneAndUpdate(
      { _id: id },
      { $set: { ...rest, updatedBy: tokenData._id } },
      { new: true }
    );

    await Users.findOneAndUpdate(
      { _id: updated?.userId },
      { $set: { ...user } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).send(setError(messages.notFound));
    }

    return res.send(setSuccess({ data: updated }));
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).send(setError(messages.idRequired("Notification")));
  }

  const updated: INotifications | null = await Notifications.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  res.send(setSuccess({ data: updated }));
};

const saveDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { token, userId } = req.body;
  const tokenData = await DeviceToken.findOne({ token });

  if (tokenData) {
    return res.send({ message: messages.token.exist });
  }

  const updatedToken = await DeviceToken.findOneAndUpdate(
    { userId, token },
    { userId, token },
    { upsert: true, new: true }
  );

  res.send(setSuccess({ data: updatedToken }));
};

const removeDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { token, userId } = req.body;
  await DeviceToken.findOneAndDelete({ token, userId });

  res.send(setSuccess({ message: messages.token.removeDeviceToken }));
};

const testNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  // const { token, userId } = req.body;
  const { userId } = req.params;
  const passData = {
    userId,
    subject: "Testing notification app",
    body: "Testing notification body content data",
    type: "rtn",
    notificationType: "info",
  };

  const data = await sendNotification(passData);

  res.send({ data, message: "Notification sent" });
};

// Common Routers
router.get("/", ValidUserToken, getList);
router.get("/list/:userId", ValidUserToken, getList);
router.get("/:id", ValidUserToken, getDetail);
router.put("/:id", ValidUserToken, updateDoctorProfile);
router.put("/mark-as-read/:id", ValidUserToken, markAsRead);
router.post("/save-device-token", ValidUserToken, saveDeviceToken);
router.delete("/remove-device-token", ValidUserToken, removeDeviceToken);
router.get("/test/:userId", ValidUserToken, testNotification);

export default router;
