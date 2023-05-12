import { Request, Response, NextFunction } from "express";
import { AppError, asyncErrorCatcher } from "../services/error.service";
import authService from "../api/auth/auth.service";
import { UserModel } from "../api/user/user.model";

export const requireAuth = asyncErrorCatcher(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("You are not logged in! Please log in to get access.", 401));
    }

    const { id, timeStamp } = await authService.verifyToken(token);
    const currentUser = await UserModel.findById(id);
    if (!currentUser) {
      return next(new AppError("The user belonging to this token does not exist.", 401));
    }

    const changedPasswordAfter = currentUser.changedPasswordAfter(timeStamp);
    if (changedPasswordAfter) {
      return next(new AppError("User recently changed password! Please log in again.", 401));
    }
    next();
  }
);

// const requireAdmin = asyncErrorCatcher(async (req: Request, res: Response, next: NextFunction) => {
//   if (!req?.cookies?.loginToken)
//     return res.status(401).send("Not Authenticated");
//   const loggedinUser = await authService.validateToken(req.cookies.loginToken);
//   if (!loggedinUser.isAdmin) {
//     // logger.warn(loggedinUser.fullname + "attempted to perform admin action");
//     res.status(403).end("Not Authorized");
//     return;
//   }
//   next();
// });
