const express = require('express');
const floorPlanController = require('../controllers/floorPlanController')
const docxController = require("../controllers/docxController")
const storage = require('../middleware/imageStorage')
const multer = require("multer");
const requireAuth = require('../middleware/requireAuth')

const router = express.Router();

router.get('/getImage', floorPlanController.getFloorPlan)
router.get("/getDocx",docxController.getDocx)
const upload = multer({ storage: storage });

//require auth for all upload image
// router.use(requireAuth)

// router.use(requireAuth)
router.post("/uploadDocx", upload.single("file"),docxController.postDocx)
router.post("/uploadImage", upload.single("file"), floorPlanController.uploadFloorPlan);
router.get('/getAllImages',floorPlanController.getAllFloorPlan)
router.delete('/deleteImage', floorPlanController.deleteImage)

module.exports=router