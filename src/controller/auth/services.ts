import DoctorProfile from "../../models/doctor_profiles";
import PatientProfile from "../../models/patient_profiles";
import Users from "../../models/users";

const projection = {
  __v: 0,
  updatedBy: 0,
  createdAt: 0,
  updatedAt: 0,
  userId: 0,
};
export const findExistUser = async (email: string) => {
  if (!email) {
    return null; // Early return if email is invalid
  }

  try {
    const user = await Users.aggregate([
      {
        $match: { email }, // Match the user by email
      },
      {
        $set: { lastLogin: new Date() }, // Update the lastLogin field
      },
      {
        $lookup: {
          from: "roles", // Assuming the role collection is called 'roles'
          localField: "role",
          foreignField: "_id",
          as: "roleInfo", // Join the role information to the user
        },
      },
      {
        $unwind: {
          path: "$roleInfo", // Unwind the roleInfo array to make the role object directly accessible
          preserveNullAndEmptyArrays: true, // In case there's no role found, preserve null
        },
      },
      {
        $addFields: {
          roleName: "$roleInfo.role", // Add the roleName field from the roleInfo
        },
      },
      {
        $project: {
          activatedToken: 0,
          resetToken: 0,
          createdAt: 0,
          updatedAt: 0,
          contactUser: 0,
          roleInfo: 0,
          otp: 0,
          otpExpires: 0,
          lastLogin: 0,
        }, // Exclude sensitive fields
      },
    ]);

    if (user.length === 0) {
      return null; // Return null if no user is found
    }

    if (user[0]?.roleName === "doctor") {
      const userProfile: { _doc: any } | null = await DoctorProfile.findOne(
        { userId: user[0]?._id },
        projection
      );
      const doctorId = userProfile?._doc?._id;
      delete userProfile?._doc?._id;
      user[0] = { ...user[0], ...userProfile?._doc, doctorId };
    }
    if (user[0]?.roleName === "patient") {
      const userProfile: { _doc: any } | null = await PatientProfile.findOne(
        { userId: user[0]?._id },
        projection
      );
      const patientId = userProfile?._doc?._id;
      delete userProfile?._doc?._id;
      user[0] = { ...user[0], ...userProfile?._doc, patientId };
    }

    return user[0]; // Return the first user (since aggregate always returns an array)
  } catch (error) {
    //   console.error('Error during aggregation:', error);
    return null; // Return null in case of any errors
  }
};
