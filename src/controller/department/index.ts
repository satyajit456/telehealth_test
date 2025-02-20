import { setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import { Category, Department } from "../../models/common";
import { messages } from "../../language/eng";
import { ValidUserToken } from "../../services/auth";
import { IDepartment, IListQuery } from "../../interface/common";
import { isValidObjectId } from "mongoose";

const router = express.Router();

// Get Department List
const getList = async (req: Request, res: Response, next: NextFunction) => {
  const projection = { name: 1, note: 1, status: 1 };
  try {
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
            { name: { $regex: search, $options: "i" } },
            { note: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const result = await Department.aggregate([
      { $match: { status: statusVal, ...searchQuery } },
      { $sort: { [sortBy]: sort === "asc" ? 1 : -1 } },
      // { $project: projection },
      {
        $facet: {
          count: [
            {
              $count: "total", // Get total count for pagination
            },
          ],
          data: [
            { $skip: Number(page) * Number(limit) }, // Pagination skip
            { $limit: Number(limit) }, // Pagination limit
            {
              $lookup: {
                from: "categories", // Join with the 'categories' collection
                localField: "categoryId", // Department's category reference
                foreignField: "_id", // Reference the category by its _id
                as: "categories", // Join result will be stored in 'categories'
              },
            },
            {
              $project: {
                ...projection,
                categories: {
                  $map: {
                    input: "$categories", // Map through the categories
                    as: "category",
                    in: {
                      _id: "$$category._id", // Include only required fields
                      name: "$$category.name",
                    },
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const totalCount = result[0]?.count[0]?.total || 0; // Get the total count of departments
    res.send(setSuccess({ data: result[0]?.data || [], count: totalCount }));
  } catch (error) {
    res.status(400).send(setError(error, 500));
  }
};

// Create a new Department
const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const values = req.body;
    const tokenData = req.tokenData; // Extract user from token
    values.updatedBy = tokenData._id;

    const newDepartment = await Department.create(values);
    res.send(setSuccess(newDepartment, "new"));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall)); // Enhanced error handling
  }
};

// Get Department details by ID
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Department")));
    }

    const department: IDepartment | null = await Department.findOne({
      _id: id,
    });
    if (!department) {
      return res.status(400).send(setError(messages.notFound));
    }

    res.send(setSuccess({ data: department }));
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Update Department by ID
const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const tokenData = req.tokenData;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Department")));
    }

    const updatedDepartment = await Department.findOneAndUpdate(
      { _id: id },
      { $set: { ...req.body, updatedBy: tokenData._id } },
      { new: true } // Return the updated department
    );

    if (!updatedDepartment) {
      return res.status(400).send(setError(messages.notFound));
    }

    res.send(setSuccess(updatedDepartment, null, messages.success));
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Delete Department by ID
const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages.idRequired("Department")));
    }

    // Delete the department
    const result = await Department.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(400).send(setError(messages.notFound));
    }

    // Update related categories to remove the department ID
    await Category.updateMany(
      { departmentId: id },
      { $set: { departmentId: "" } }
    );

    res.send(setSuccess(null, null, messages.removedItem));
  } catch (error) {
    next(error); // Pass error to next middleware for centralized handling
  }
};

// Common routers
router.get("/", ValidUserToken, getList);
router.post("/", ValidUserToken, createDepartment);
router.get("/:id", ValidUserToken, getDetail);
router.put("/:id", ValidUserToken, updateDepartment);
router.delete("/:id", ValidUserToken, deleteDepartment);

export default router;
