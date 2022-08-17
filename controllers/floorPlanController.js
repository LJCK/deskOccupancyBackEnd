const imageModel = require('../models/floorPlan')
const fs = require("fs");

const uploadFloorPlan=async(req, res) => {
  const existingFloorPlan = await imageModel.findOneAndReplace({_id: req.body.UID},{
    img: {
    data: fs.readFileSync("uploads/" + req.file.filename),
    contentType: "image/png",
  }})
  if(existingFloorPlan){
    res.status(200).send('Floor plan is updated')
  }else{
    const saveImage =  imageModel({
      _id: req.body.UID,
      img: {
        data: fs.readFileSync("uploads/" + req.file.filename),
        contentType: "image/png",
      },
    });
    saveImage
      .save()
      .then((res) => {
        res.status(200).send('Floor plan is uploaded')
      })
      .catch((err) => {
        res.send(err)
      });
  }
  
}

const getFloorPlan=async(req,res)=>{
  const data = []
  const image =await imageModel.findById({_id:req.query.filename}).catch(err =>console.log(err))
  data.push(image)
  res.json(data)
}

const getAllFloorPlan = async(req,res)=>{
  
}

module.exports = {
  uploadFloorPlan,
  getFloorPlan
}