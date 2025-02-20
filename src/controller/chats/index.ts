import { ObjectId, setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import { messages } from "../../language/eng";
import { ValidUserToken } from "../../services/auth";
import Chats from "../../models/chats";
import Appointments from "../../models/appointments";
import Users from "../../models/users";
import { IChats, IListQuery } from "../../interface/common";
import { isValidObjectId } from "mongoose";

const router = express.Router();

// Get contact user list
const getUsersList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const {
      // limit = Number(process.env.LIMIT) || 10,
      // page = 0,
      // sortBy = "_id",
      // sort = "desc",
      // status = "true",
      search = "",
    }: IListQuery = req.query;

    const { id } = req.params;

    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const user = await Users.findOne({ _id: id }, { contactUser: 1 });
    if (!user) {
      res.status(400).send(setError(messages?.userNotFound));
      return;
    }

    const { contactUser } = user;

    const contacts = await Users.aggregate([
      { $match: { _id: { $in: contactUser } } }, // Match the user by IDs
      {
        $project: {
          name: 1,
          email: 1,
          chatEnabled: 1,
          photo: 1,
        },
      }, // Project only the desired fields of the contacts
      { $match: { ...searchQuery } },
    ]);

    res.send(setSuccess({ data: contacts }));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Get chat message list
const getUserList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const {
      limit = 100,
      sortBy = "_id",
      sort = "desc",
      search = "",
    }: IListQuery = req.query;
    const { type, id } = req.params;

    let lookup: any;
    switch (type) {
      case "doctor": {
        lookup = [
          {
            $lookup: {
              from: "patient_profiles",
              localField: "patientId",
              foreignField: "_id",
              as: "patient",
              pipeline: [{ $project: { userId: 1 } }],
            },
          },
          { $unwind: "$patient" },
          { $set: { patientUserId: "$patient.userId" } },
          {
            $lookup: {
              from: "users",
              localField: "patient.userId",
              foreignField: "_id",
              as: "user",
              pipeline: [
                { $project: { name: 1, email: 1, _id: 1, chatEnabled: 1 } },
              ],
            },
          },
          { $unwind: "$user" },
        ];
        break;
      }
      case "patient":
        lookup = [
          {
            $lookup: {
              from: "doctor_profiles",
              localField: "doctorId",
              foreignField: "_id",
              as: "doctor",
              pipeline: [{ $project: { userId: 1 } }],
            },
          },
          { $unwind: "$doctor" },
          { $set: { doctorUserId: "$doctor.userId" } },
          {
            $lookup: {
              from: "users",
              localField: "doctor.userId",
              foreignField: "_id",
              as: "user",
              pipeline: [
                { $project: { name: 1, email: 1, _id: 1, chatEnabled: 1 } },
              ],
            },
          },
          { $unwind: "$user" },
        ];
        break;
      default:
        lookup = [];
        break;
    }

    const searchQuery = search
      ? {
          $or: [{ name: { $regex: search, $options: "i" } }],
        }
      : {};

    const groupBy =
      type === "doctor"
        ? { patientId: "$patientId" }
        : { doctorId: "$doctorId" };

    const query = {
      $and: [
        {
          $or: [
            { doctorId: new ObjectId(id.toString()) },
            { patientId: new ObjectId(id.toString()) },
          ],
        },
        { $or: [{ type: "chat" }, { type: "call" }] },
      ],
    };

    const filter = type !== "doctor" ? { "user.chatEnabled": true } : {};

    const appointmentBooked = await Appointments.aggregate([
      { $match: query },
      ...lookup,
      { $set: { name: "$user.name" } },
      { $match: { ...searchQuery, ...filter } },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      {
        $group: {
          _id: {
            name: "$user.name", // Group by name
            ...groupBy, // Group by doctorId
          }, // Group by name to avoid duplicates
          appointmentId: { $first: "$_id" },
          name: { $first: "$name" }, // Get the first value of 'name' for each group
          doctorId: { $first: "$doctorId" }, // Get the first value of doctorId
          patientId: { $first: "$patientId" }, // Get the first value of patientId
          doctorUserId: { $first: "$doctorUserId" },
          patientUserId: { $first: "$patientUserId" },
        },
      },
      {
        $project: { _id: 0 },
      },
    ]);

    res.send(setSuccess({ data: appointmentBooked }));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Create new chat message
export const createNewMsg = async (data: IChats): Promise<IChats> =>
  await Chats.create(data);

// Send a new chat message
const sendMessage = async (
  req: Request, //<{ sender: string; receiver: string }, {}, IChats, {}>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { sender, receiver } = req.params;
    const values = req.body;

    if (!isValidObjectId(sender) || !isValidObjectId(receiver))
      return res.status(400).send(setError(messages.InvalidValues));

    const newMessage: IChats | null = await createNewMsg({
      ...values,
      sender: new ObjectId(sender),
      receiver: new ObjectId(receiver),
    });

    // Emit the new message to all clients in the chat room
    // io.to(receiver).emit('new_message', newMessage);

    res.send(setSuccess({ data: newMessage }, "new"));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Get chat message list
const getList = async (
  req: Request<{ sender: string; receiver: string }, {}, {}, {}>,
  res: Response<{ data: IChats[] }>,
  next: NextFunction
): Promise<any> => {
  try {
    const { sender, receiver } = req.params;
    const messages = await Chats.find({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort("timestamp");
    res.send(setSuccess({ data: messages }));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Delete chat message
const deleteChatMessage = async (
  req: Request<{ id: string }, {}, {}, {}>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    return res.send("Message Deleted");
  } catch (error) {
    next(error);
  }
};

router.get("/:sender/:receiver", ValidUserToken, getList);
router.post("/:sender/:receiver", ValidUserToken, sendMessage);
router.delete("/:id", ValidUserToken, deleteChatMessage);
router.get("/user/:type/:id", ValidUserToken, getUserList);

router.get("/users/list/:id", ValidUserToken, getUsersList); //:id required user id

export default router;
