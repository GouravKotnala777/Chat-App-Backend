import express from "express";
import { addMembers, createGroupChat, deleteChat, getChatDetailes, getMyChats, getMyGroups, leaveGroup, removeMember, renameGroup } from "../controllers/chatController.js";
import { isUserAuthenticated } from "../middlewares/auth.js";
// import { attachmentsMulter } from "../middlewares/multer.js";

const router = express.Router();

router.route("/new").post(isUserAuthenticated, createGroupChat);
router.route("/my/chats").get(isUserAuthenticated, getMyChats);
router.route("/my/groups").get(isUserAuthenticated, getMyGroups);
router.route("/addmembers").put(isUserAuthenticated, addMembers);
router.route("/removemember").put(isUserAuthenticated, removeMember);
router.route("/leave/:chatID").delete(isUserAuthenticated, leaveGroup);
// router.route("/message").post(isUserAuthenticated, attachmentsMulter, sendAttachments);
// router.route("/message/:chatID").get(isUserAuthenticated, getMessages);
router.route("/:chatID").get(isUserAuthenticated, getChatDetailes)
                        .put(isUserAuthenticated, renameGroup)
                        .delete(isUserAuthenticated, deleteChat);

export default router;