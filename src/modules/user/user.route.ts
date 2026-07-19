import { Router } from "express";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";

const router = Router();

router.post(
    "/",
    validateRequest(UserValidation.createUserSchema),
    UserController.createUser
);

router.get("/", UserController.getAllUsers);

router.get("/:id", UserController.getUserById);

router.patch(
    "/:id",
    validateRequest(UserValidation.updateUserSchema),
    UserController.updateUser
);

router.patch('/:userId/role/:newRole', UserController.updateUserRole);

router.delete("/:id", UserController.deleteUser);

export const UserRoutes = router;
