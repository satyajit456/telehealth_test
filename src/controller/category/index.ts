import { ObjectId, setError, setSuccess } from "../../utils/global";
import express, { Response, Request, NextFunction } from "express";
import { Category, Department } from "../../models/common";
import { messages } from "../../language/eng";
import { ValidUserToken } from "../../services/auth";
import { ICategory, IListQuery } from "../../interface/common";
import { isValidObjectId, Types } from "mongoose";

const router = express.Router();

// Get Category list
const getList = async (req: Request, res: Response, next: NextFunction) => {
  const projection = {
    createdBy: 0,
    __v: 0,
  };
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

    // Handle search query
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { note: { $regex: search, $options: "i" } },
            { "department.name": { $regex: search, $options: "i" } },
            { "department.note": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const result = await Category.aggregate([
      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
          pipeline: [
            { $match: { status: true } },
            {
              $project: {
                name: 1,
                note: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$department" },
      { $match: { status: statusVal, ...searchQuery, ...req?.body } },
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
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
};

// Create new Category
const Createcategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const values = req.body;
    const tokenData: { _id: Types.ObjectId } = req.tokenData;
    values.updatedBy = tokenData._id;
    // {name: string; _id: Types.ObjectId; note:string; departmentId:Types.ObjectId, status: boolean; icon:string } | null
    // Create new category
    const newCategory: any | null = await Category.create(values);
    // Update the corresponding department
    await Department.findOneAndUpdate(
      { _id: values.departmentId },
      { $push: { categoryId: newCategory?._id } }
    );

    res.send(setSuccess(newCategory, "new"));
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
    // next(error);
  }
};

// Get Category details
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages?.idRequired("Category")));
    }

    const detail: ICategory | null = await Category.findOne({
      _id: new ObjectId(id),
    });

    if (detail) {
      return res.send(setSuccess({ data: detail }));
    } else {
      return res.status(400).send(setError(messages.notFound));
    }
  } catch (error) {
    res.status(400).send(setError(error || messages.failCall));
    // next(error); // Pass the error to the error handler
  }
};

// Update Category
const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const tokenData: { _id: Types.ObjectId } = req.tokenData;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages?.idRequired("Category")));
    }

    const updated: ICategory | null = await Category.findOneAndUpdate(
      { _id: id },
      { $set: { ...req.body, updatedBy: tokenData._id } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).send(setError(messages.notFound));
    }

    return res.send(setSuccess(updated));
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// delete Category
const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).send(setError(messages?.idRequired("Category")));
    }

    const category: ICategory | null = await Category.findById(id);
    if (!category) {
      return res.status(400).send(setError(messages.notFound));
    }

    const result = await Category.deleteOne({ _id: new ObjectId(id) });

    await Department.findOneAndUpdate(
      { _id: category.departmentId },
      { $pull: { categoryId: category._id } }
    );

    if (result.deletedCount > 0) {
      return res.send(setSuccess(null, null, messages.removedItem));
    } else {
      return res.status(400).send(setError(messages.unableToDelete));
    }
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

/* common routers */
router.get("/", ValidUserToken, getList);
router.post("/", ValidUserToken, Createcategory);
router.get("/:id", ValidUserToken, getDetail);
router.put("/:id", ValidUserToken, updateCategory);
router.delete("/:id", ValidUserToken, deleteCategory);

export default router;
