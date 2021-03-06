const express = require('express');
const floorPlanController = require('../controllers/floorPlanController')
const storage = require('../imageMiddleware/imageStorage')
const multer = require("multer");
const router = express.Router();

const upload = multer({ storage: storage });

router.post("/uploadImage", upload.single("file"), floorPlanController.uploadFloorPlan);
router.get('/getImage', floorPlanController.getFloorPlan)

module.exports=router