const imageModel = require('../models/floorPlan')
const fs = require("fs");

const uploadFloorPlan=async(req, res) => {
  console.log(req.body)
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
      location:req.body.location,
      level: req.body.level,
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
  const images = await imageModel.aggregate([
    {$project:{location: 1, level: 1} },
    {$sort: {level:1}}
  ])
  res.status(200).send(images)
}

const deleteImage = async(req,res)=>{
  const imageID = req.body.id
  try{
    await imageModel.findOneAndDelete({"_id":imageID})
    res.status(200).send("image deleted")
  }catch(error){
    res.send("error")
  }
  
}

module.exports = {
  uploadFloorPlan,
  getFloorPlan,
  getAllFloorPlan,
  deleteImage
}