const imageModel = require('../models/floorPlan')
const fs = require("fs");

const uploadFloorPlan=async(req, res) => {
  const existingFloorPlan = await imageModel.findOneAndReplace({_id: req.body.UID},{
    img: {
    data: fs.readFileSync("uploads/" + req.file.filename),
    // data:req.file.filename,
    contentType: "image/png",
  }})
  if(existingFloorPlan){
    res.status(200).send('Floor plan is updated')
  }else{
    const saveImage =  imageModel({
      _id: req.body.id,
      img: {
        data: fs.readFileSync("uploads/" + req.file.filename),
        // data:req.file.filename,
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
  try{
    const data = []
    const image =await imageModel.findById({_id:req.query.UID}).catch(err =>console.log(err))
    if(image === null){
      throw new Error("Image is null")
    }
    data.push(image)
    res.json(data)
  }catch(err){
    res.send(err)
  }
  
}

module.exports = {
  uploadFloorPlan,
  getFloorPlan
}