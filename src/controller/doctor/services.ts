import {Types} from "mongoose";
import { IListQuery } from "../../interface/common";
import DoctorProfile from "../../models/doctor_profiles";
import PatientProfile from "../../models/patient_profiles";
import { ObjectId } from "../../utils/global";

interface Department {
    name: string;
}
  
interface Category {
    name: string;
}

interface DoctorProfileData {
    _id: Types.ObjectId;
    dob: Date;
    category: Category;
    department: Department;
    status: boolean;
    gender: string;
    experienceYears: number;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    detail: string;
    rating: number;
    userId: Types.ObjectId;
    photo: string;
    username: string;
    liked: boolean;
}

// Define the shape of the `result` returned from aggregation
// interface AggregationResult {
//     data: DoctorProfileData[];
//     count: number;
// }

const projection = {
    dob:1,
    category:1,
    department:1,
    status: 1,
    gender: 1,
    experienceYears: 1,
    firstName: "$user.firstName",
    lastName: "$user.lastName",
    name: "$user.name",
    email: "$user.email",
    detail: 1,
    rating: 1,
    userId: 1,
    photo: "$user.photo",
    username: "$user.username",
};


interface ListenParams {
    profileFilter?: any;
    currentuserId?: Types.ObjectId | string;
    query?: IListQuery;
    body?: { department?: string; category?: string };
}

export async function doctorList({profileFilter={}, currentuserId, query = {}, body = {} }: ListenParams): Promise<{ data: DoctorProfileData[]; count: number } | Error | undefined> {
    try {
        // Get liked doctors
        const liked: { likedDoctors: string[] } | null = currentuserId ? await PatientProfile.findOne(
            { userId: currentuserId },
            { likedDoctors: 1 }
        ) : null;

        // query params
        const {
          limit = Number(process.env.LIMIT) || 10,
          page = 0,
          sortBy = "_id",
          sort = "desc",
          status = "true",
          search = "",
        }: IListQuery = query;

        const statusVal: boolean = status === "true";
    
        const {department, category, ...restBodyFilter} = body;
        let filter: {department?: object; category?: object} = {};
        if(department) filter.department = new ObjectId(department);
        if(category) filter.category = new ObjectId(category);
    
        // search query
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
    
        // Aggregation pipeline
        const result = await DoctorProfile.aggregate([
          {$match: {...profileFilter, ...filter}},
          {
            $lookup: {
              from: "departments", // The name of the user collection in MongoDB
              localField: "department", // Field in the doctor collection
              foreignField: "_id", // Field in the user collection
              as: "department", // Alias for the resulting merged data
              pipeline: [
                { $match: { status: true } },
                {
                  $project: {
                    name:1
                  },
                },
              ],
            },
          },
          {
            $unwind: "$department", // Flatten the userDetails array
          },
          {
            $lookup: {
              from: "categories", // The name of the user collection in MongoDB
              localField: "category", // Field in the doctor collection
              foreignField: "_id", // Field in the user collection
              as: "category", // Alias for the resulting merged data
              pipeline: [
                { $match: { status: true } },
                {
                  $project: {
                    name:1
                  },
                },
              ],
            },
          },
          {
            $unwind: "$category", // Flatten the userDetails array
          },
          {
            $lookup: {
              from: "users", // The name of the user collection in MongoDB
              localField: "userId", // Field in the doctor collection
              foreignField: "_id", // Field in the user collection
              as: "user", // Alias for the resulting merged data
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
          {
            $unwind: "$user", // Flatten the userDetails array
          },
          {
            $project: {
              ...projection,
            },
          },
          { $match: { status: statusVal, ...searchQuery, ...restBodyFilter } },
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
              data: [{ $skip: Number(page) * Number(limit) }, { $limit: Number(limit) }],
            },
          },
        ])

        let count =
        result[0].count.length > 0 && result[0].count[0].count
            ? result[0].count[0].count
            : 0;

        const dataList = result[0].data.map((item: DoctorProfileData) => ({
        ...item,
        liked: liked?.likedDoctors?.some(val=> val.toString() === item.userId.toString()),
        }));
        
        return { data: dataList, count }; // Return the data and count
      } catch (error) {
        if (error instanceof Error) {
          return error;
        }
        return new Error('An unknown error occurred');
      }
}