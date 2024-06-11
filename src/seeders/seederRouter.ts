import express from "express";
import { createUserSeeder } from "./seederController.js";

const router = express.Router();

router.route("/user").post(createUserSeeder);

export default router;