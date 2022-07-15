const express = require('express');
const deskController = require('../controllers/deskController')
const router = express.Router();


router.get('/', (req,res)=>{
  res.send("Welcome to backend");
})
router.get('/getDeskStatus',deskController.get_desk_status)
router.get('/getAllLevels',deskController.get_all_levels)

module.exports = router;