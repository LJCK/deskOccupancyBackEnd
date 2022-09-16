const express = require('express');
const floorPlanController = require('../controllers/floorPlanController')
const storage = require('../middleware/imageStorage')
const multer = require("multer");
const requireAuth = require('../middleware/requireAuth')

const router = express.Router();

router.get('/getImage', floorPlanController.getFloorPlan)

const upload = multer({ storage: storage });

//require auth for all upload image
// router.use(requireAuth)

router.post("/uploadImage", upload.single("file"), floorPlanController.uploadFloorPlan);
router.get('/getAllImages',floorPlanController.getAllFloorPlan)
router.delete('/deleteImage', floorPlanController.deleteImage)

module.exports=router