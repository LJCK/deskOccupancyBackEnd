const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = require('../imageMiddleWare/imageStorageEngine')
const floorPlanController = require("../controllers/floorPlanController")

const upload = multer({ storage });

router.post('/uploadImage',upload.single("file"),floorPlanController.uploadFloorPlan)
router.get('/getImage',floorPlanController.getImage)
module.exports=router