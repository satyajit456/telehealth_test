import {
  ObjectId,
  setError,
  setSuccess,
  strictValidObject,
} from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import Users from "../../models/users";
import { Roles } from "../../models/common";
import { ValidUserToken } from "../../services/auth";
import PatientProfile from "../../models/patient_profiles";
import { isValidObjectId, set, Types } from "mongoose";
import DoctorProfile from "../../models/doctor_profiles";
import { IListQuery } from "../../interface/common";
import { doctorList } from "../doctor/services";

const router: any = express.Router();

interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
}
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_API,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get Role List
const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      limit = Number(process.env.LIMIT) || 10,
      page = 0,
      sortBy = "_id",
      sort = "desc",
    }: // status = "true",
    // search = "",
    IListQuery = req.query;

    let type = {};

    // if (query.type === 'user') {
    //   type = { $nor: [{ role: 'admin' }, { role: "staff" }] };
    // }
    // if (query.type === 'admin') {
    //   type = { $or: [{ role: 'admin' }, { role: "staff" }] };
    // }

    const roles = await Roles.find({ ...type })
      .skip(Number(page) * Number(limit))
      .limit(Number(limit))
      .sort({ [sortBy]: sort === "asc" ? 1 : -1 });

    res.send(setSuccess({ data: roles }));
  } catch (error: unknown) {
    res.status(400).send(setError(error));
  }
};

// Validate if username or email is already taken
const validateUsernameEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, value } = req.params;
    if (!type || !value) {
      return res.status(400).send(setError("Type and value are required"));
    }

    const user = await Users.findOne({ [type]: value });
    if (strictValidObject(user)) {
      return res.status(400).send(setError({ message: `${type} already used`, valid: false }));
    }
    return res.status(400).send(setError({ message: `${type} is available`, valid: true }));
  } catch (e: any) {
    res.status(400).send(setError({ message: "Internal Server Error", error: e?.message }));
  }
};

// Upload file to Cloudinary
const uploadFile = async (
  req: FileUploadRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { _id } = req.tokenData;
    const { type = "images" } = req.body;
    const path = `users/${_id}/${type}/`;

    if (!req?.file) {
      return res.status(400).send(setError("No file uploaded."));
    }

    cloudinary.uploader
      .upload_stream({ resource_type: "auto" }, (error, result) => {
        if (error) {
          return res.status(400).send(setError("Error uploading file to Cloudinary"));
        }

        return res.send(setSuccess({
          message: "File uploaded successfully!",
          fileUrl: `${result?.secure_url}?publicId=${result?.publicId}&signature=${result?.signature}`,
        }));
      })
      .end(req.file.buffer);
  } catch (e) {
    // console.error("File upload error:", e);
    res.status(400).send(setError(e));
  }
};

// Delete file from Cloudinary
const deleteUploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { publicId } = req.params;

    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        return res.status(400).send(setError("Error deleting file from Cloudinary"));
      }

      if (result?.result === "ok") {
        res.send(setSuccess({
          message: "File deleted successfully!",
          ...result,
        }));
      } else {
        res.status(400).send(setError("File not found"));
      }
    });
  } catch (e) {
    // console.error("File delete error:", e);
    res.status(400).send(setError(e));
  }
};

// Get Liked Users (Doctors or Patients)
const LikedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.query;
    if (id && !isValidObjectId(id)) {
      return res.status(400).send(setError("Invalid Id"));
    }
    const liked: { likedDoctors?: Types.ObjectId[] } | null =
      await PatientProfile.findOne(
        { userId: id || req.tokenData._id },
        { likedDoctors: 1 }
      );
    if (liked?.likedDoctors?.length) {
      const data = await doctorList({
        profileFilter: { userId: { $in: liked.likedDoctors } },
        currentuserId: id || req.tokenData._id,
        query: req.query,
        body: req.body,
      });
      return res.send(setSuccess(data));
    }
    return res.send(setSuccess({ data: [], count: 0 }));
  } catch (error) {
    next(error);
  }
};

// Update Like Status for Doctors/Patients
const updateLike = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const tokenData: any = req.tokenData;
    const { type, id, status } = req.params;
    const { userId } = req.query as { userId?: string };

    if (userId && !isValidObjectId(userId)) {
      return res.status(400).send(setError("Invalid Id"));
    }

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError("ID is required"));
    }

    const likedId =
      type === "doctor"
        ? await DoctorProfile.findOne({ userId: new ObjectId(id) })
        : await PatientProfile.findOne({ userId: new ObjectId(id) });

    if (!likedId) {
      return res.status(400).send(setError("Invalid like Id"));
    }

    const updateLike =
      status === "true"
        ? { $addToSet: { likedDoctors: id } }
        : { $pull: { likedDoctors: id } };

    const updated = await PatientProfile.findOneAndUpdate(
      { userId: userId ? new ObjectId(userId) : tokenData._id },
      { $set: { updatedBy: tokenData._id }, ...updateLike },
      { new: true }
    );

    if (!updated) {
      return res.status(400).send(setError("Patient Profile not found"));
    }

    return res.send(setSuccess({ message: "Updated like id." }));
  } catch (error) {
    next(error);
  }
};

/* common routers */
router.get("/roles", getRoles);
router.get("/verify/:type/:value", validateUsernameEmail);
router.post("/upload", ValidUserToken, upload.single("files"), uploadFile); //upload.single('files'), or upload.array('files')
router.delete("/delete/:publicId", ValidUserToken, deleteUploadFile);
router.get("/liked/:type", ValidUserToken, LikedUsers);
router.put("/like/:type/:id/:status", ValidUserToken, updateLike);

export default router;
