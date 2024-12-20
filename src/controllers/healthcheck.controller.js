import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthCheck = asyncHandler(async (req, res) => {
  console.log("logs from healthCheck : ");
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "healthCheck successfully done !!!"));
});

const health = asyncHandler(async(req, res)=> {
  res.status(200).json(new ApiResponse(200, "data", "health"));
})

export { healthCheck, health};  