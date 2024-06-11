import express from "express";
import { isUserAuthenticated } from "../middlewares/auth.js";
import { deleteMessages, getMessages, sendAttachments } from "../controllers/messageController.js";
import { attachmentsMulter } from "../middlewares/multer.js";

const router = express.Router();

router.route("/new").post(isUserAuthenticated, attachmentsMulter, sendAttachments);
router.route("/delete").delete(isUserAuthenticated, deleteMessages);
router.route("/:chatID").get(isUserAuthenticated, getMessages);

export default router;