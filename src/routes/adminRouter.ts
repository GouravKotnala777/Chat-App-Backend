import express from "express";
import { adminLogin, adminLogout, getAllChats, getAllMessages, getAllUsers, getDashboardStats } from "../controllers/adminController.js";
import { isUserAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.route("/verify").post(adminLogin);
router.route("/logout").get(adminLogout);

router.use(isUserAdmin);
router.route("/").get();
router.route("/users").get(getAllUsers);
router.route("/chats").get(getAllChats);
router.route("/messages").get(getAllMessages);
router.route("/stats").get(getDashboardStats);

export default router;