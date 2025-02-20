import { setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import { ValidUserToken } from "../../services/auth";
import mongoose, { Types } from "mongoose";
import Appointments from "../../models/appointments";
import { messages } from "../../language/eng";
import { scheduleAppointment } from "../../services/rtn/appointment";
import { checkBookedSlot } from "./services";
import { IAppointment, IAppointmentQuery, IUpdateAppointmentRequest } from "../../interface/appointment";

const router = express.Router();


// get Appointments list
const getList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const projection = {
    __v: 0,
    doctorId: 0,
    patientId: 0,
    createdBy: 0,
    updatedBy: 0,
    createdAt: 0,
    updatedAt: 0
  };

  try {
    const {
      limit = Number(process.env.limit) || 10,
      page = 0,
      sortBy = "_id",
      sort = "desc",
      status,
      search = "",
      doctorId,
      patientId,
    }: IAppointmentQuery = req.query;

    const statusVal = status === "false" ? false : true;
    let matchVal: Record<string, unknown> = { status: statusVal };

    if (doctorId) {
      matchVal.doctorId = new Types.ObjectId(doctorId);
    }
    if(patientId){
      matchVal.patientId = new Types.ObjectId(patientId);
    }

    const searchQuery = search
      ? {
          $or: [
            { "doctor.name": { $regex: search, $options: "i" } },
            { "patient.name": { $regex: search, $options: "i" } },
            { "doctor.email": { $regex: search, $options: "i" } },
            { "patient.email": { $regex: search, $options: "i" } },
            { "type": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const result = await Appointments.aggregate([
      { $match: matchVal },
      { $lookup: {from: "doctor_profiles", localField: "doctorId", foreignField: "_id", as: "doctorId", pipeline: [{ $project: { userId: 1 }}]} },
      { $unwind: "$doctorId" },
      { $lookup: {from: "users", localField: "doctorId.userId", foreignField: "_id", as: "doctor", pipeline: [{ $project: { name: 1, email: 1, _id: 1 }}]} },
      { $unwind: "$doctor" },
      { $lookup: {from: "patient_profiles", localField: "patientId", foreignField: "_id", as: "patientId", pipeline: [{ $project: { userId: 1 }}]} },
      { $unwind: "$patientId" },
      { $lookup: {from: "users", localField: "patientId.userId", foreignField: "_id", as: "patient", pipeline: [{ $project: { name: 1, email: 1, _id: 1 }}]} },
      { $unwind: "$patient" },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      { $project: projection },
      { $match: { ...searchQuery } },
      {
        $facet: {
          count: [{ $group: { _id: null, count: { $sum: 1 } } }],
          data: [{ $skip: Number(page) * Number(limit) }, { $limit: Number(limit) }],
        },
      },
    ]);

    let count = result[0].count.length > 0 ? result[0].count[0].count : 0;
    res.send(setSuccess({ data: result[0].data, count }));
  } catch (error) {
    next(error);
    // res.status(500).send(error);
  }
};


// Check doctor slots
const checkDoctorSolts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const doctorId = req.query.doctorId as string;
    const date = req.query.date as string;

    if (!doctorId || !date) {
      return res.status(400).send(setError("doctorId and date are required"));
    }

    const slotsExist = await checkBookedSlot({ doctorId, date });
    res.send({ status: true, data: slotsExist });
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// create new Appointments
const createAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { doctorId, date, appointmentTime }: { doctorId: string; date: string; appointmentTime: string } = req.body;
    const slotsExist = await checkBookedSlot({ doctorId, date, time: appointmentTime });
    
    if (slotsExist?.length > 0) {
      return res.status(400).json({ error: "No available slots for this date or time" });
    }

    const values = { ...req.body, createdBy: req.tokenData._id, updatedBy: req.tokenData._id };
    const newAppointment: IAppointment = await Appointments.create(values);
    await scheduleAppointment(newAppointment);
    res.send({ status: true, data: newAppointment });
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
  }
};

// Get Appointment detail
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const projection = {
    __v: 0,
    doctor: 0,
    patient: 0,
    createdBy: 0,
    updatedBy: 0,
    createdAt: 0,
    updatedAt: 0
  };
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({ error: "Appointment ID is required" });
    }

    const detail:any = await Appointments.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      { $lookup: { from: "doctor_profiles", localField: "doctorId", foreignField: "_id", as: "doctor", pipeline: [{ $project: { userId: 1, breakTime: 1, workingDays: 1, consultTime: 1 }}] } },
      { $unwind: "$doctor" },
      { $lookup: { from: "users", localField: "doctor.userId", foreignField: "_id", as: "doctorId", pipeline: [{ $project: { name: 1, email: 1 }}] } },
      { $unwind: "$doctorId" },
      { $set: { 'doctorId._id': '$doctor._id', 'doctorId.breakTime': '$doctor.breakTime', 'doctorId.workingDays': '$doctor.workingDays', 'doctorId.consultTime': '$doctor.consultTime' } },
      { $lookup: { from: "patient_profiles", localField: "patientId", foreignField: "_id", as: "patient", pipeline: [{ $project: { userId: 1 }}] } },
      { $unwind: "$patient" },
      { $lookup: { from: "users", localField: "patient.userId", foreignField: "_id", as: "patientId", pipeline: [{ $project: { name: 1, email: 1 }}] } },
      { $unwind: "$patientId" },
      { $set: { 'patientId._id': '$patient._id' } },
      { $project: projection },
    ]);

    if (detail.length > 0) {
      return res.send(setSuccess({ data: detail[0] }));
    } else {
      return res.status(404).send(setError("Appointment not found"));
    }
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Update Appointment
const updateAppointments = async (
  req: Request<{ id: string }, {}, IUpdateAppointmentRequest>,  // ID is part of the params and body should be IUpdateAppointmentRequest
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, reason, appointmentTime, type } = req.body;

    // Ensure the appointment ID is provided
    if (!id) {
      return res.status(400).send(setError("Appointments ID is required"));
    }

    // Find the existing appointment details
    const appointmentDetail: IAppointment | null = await Appointments.findOne({ _id: id });

    // Check if the appointment exists and validate the new appointment time
    if (
      appointmentDetail &&
      appointmentTime !== appointmentDetail.appointmentTime
    ) {
      const slotsExist = await checkBookedSlot({
        doctorId: appointmentDetail.doctorId,
        date: appointmentDetail.date?.toString() || '', // Ensure date is not undefined
        time: appointmentTime,
      });

      // If the slot is already booked, return an error
      if (slotsExist?.length > 0) {
        return res
          .status(400)
          .json(setError("Slot already booked by another user"));
      }
    }

    // Prepare the updated data
    const updatedData: IUpdateAppointmentRequest = { status, reason, appointmentTime, type };

    // Perform the update operation
    const updated: IAppointment | null = await Appointments.findOneAndUpdate(
      { _id: id },
      { $set: { ...updatedData, updatedBy: req.tokenData._id } },
      { new: true }
    );

    // If no appointment is found, return a 404 error
    if (!updated) {
      return res.status(404).send(setError("Appointment not found"));
    }

    // Send the updated appointment data as a response
    return res.send({ data: updated, message: "success" });
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

/* common routers */
router.get("/", ValidUserToken, getList);
router.get("/booked-slots", ValidUserToken, checkDoctorSolts);
router.post("/", ValidUserToken, createAppointments);
router.get("/:id", ValidUserToken, getDetail);
router.put("/:id", ValidUserToken, updateAppointments);
// router.get("/booked-slots/:doctorId/:date", ValidUserToken, bookedSolts);

export default router;
