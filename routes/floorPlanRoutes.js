const express = require('express');
const floorPlanController = require('../controllers/floorPlanController')
const storage = require('../imageMiddleware/imageStorage')
const multer = require("multer");
const router = express.Router();

const maxSize = 110
const upload = multer({ storage: storage, limits: { fileSize: maxSize } });

router.post("/uploadImage", upload.single("file"), floorPlanController.uploadFloorPlan);
router.get('/getImage', floorPlanController.getFloorPlan)

module.exports=router