const imageModel = require('../models/floorPlan')
const fs = require("fs");

const uploadFloorPlan=(req, res) => {
  const saveImage =  imageModel({
    _id: req.body.id,
    img: {
      data: fs.readFileSync("uploads/" + req.file.filename),
      // data:req.file.filename,
      contentType: "image/jpg",
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
  const data = []
  data.push(await imageModel.findById({_id:req.query.filename}))
  res.json(data)
}

module.exports = {
  uploadFloorPlan,
  getFloorPlan
}