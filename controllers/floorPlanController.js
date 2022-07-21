const imageModel = require('../models/floorPlan')
const fs = require("fs");

const uploadFloorPlan=(req, res) => {
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
      console.log("image is saved");
    })
    .catch((err) => {
      console.log(err, "error has occur");
    });
    res.send('image is saved')
}

const getFloorPlan=async(req,res)=>{
  try{
    const data = []
    const image =await imageModel.findById({_id:req.query.filename}).catch(err =>console.log(err))
    if(image === null){
      throw new Error("Image is null")
    }
    data.push(image)
    res.json(data)
  }catch(err){
    console.log(err)
  }
  
}

module.exports = {
  uploadFloorPlan,
  getFloorPlan
}