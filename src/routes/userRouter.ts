import express from "express";
import { acceptFriendRequest, createUser, getMyAllFriends, getMyNotifications, login, logout, me, searchUsers, sendFriendRequest } from "../controllers/userController.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.route("/new").post(singleAvatar, createUser);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/me").get(isUserAuthenticated, me);
router.route("/search").get(isUserAuthenticated, searchUsers);
router.route("/sendrequest").put(isUserAuthenticated, sendFriendRequest);
router.route("/acceptrequest").put(isUserAuthenticated, acceptFriendRequest);
router.route("/notifications").get(isUserAuthenticated, getMyNotifications);
router.route("/friends").get(isUserAuthenticated, getMyAllFriends);

export default router;