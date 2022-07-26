const {newOccupancy} = require("../models/desk")
const moment = require("moment");

const get_desk_status=async(req,res)=>{
  console.log(req.query.level)
  const query_level = req.query.level
  const floor = await newOccupancy.findOne({level:query_level})
  occupancy_array=[]
  for(let desk_id in floor.desks){
    let expiry_time = moment(floor.desks[desk_id]["expiryTime"],"hh:mm:ss");
    occupancy_status={}
    if(floor.desks[desk_id]["expiryTime"]===null || expiry_time.isBefore(moment.utc().local())){
      occupancy_status["id"]=desk_id
      occupancy_status[desk_id]='unoccupied'
      occupancy_status['expiryTime']= null
      
    }else{
      occupancy_status["id"]=desk_id
      occupancy_status[desk_id]='occupied'
      occupancy_status['expiryTime']= floor.desks[desk_id]["expiryTime"]
    }
    occupancy_array.push(occupancy_status)
  }
  
  res.send(occupancy_array)
}

const get_all_levels=async(req,res)=>{
  const floors = await newOccupancy.find()
  levels=[]
  floors.forEach((floor)=>{
    levels.push(floor.level)
  })
  res.send(levels)
}

const add_desk=async(req,res)=>{
  const deskID = req.body.deskID
  const location = req.body.location
  const locationID = req.body.locationID
  const level = req.body.level

  let deskObj = await newOccupancy.findOne({_id: location,'desks.deskID':deskID})
  if(deskObj){
    res.status(409).send("Table ID already exists.")
  }else{
    let deskObj = await newOccupancy.findOneAndUpdate({_id: location},{'$push':{"desks":{deskID:deskID,expiryTime: null}}})
    if(deskObj){
      res.status(200).send("Table added")
    }else{
      let deskObj = await newOccupancy({_id:locationID, location:location, level:level,desks:[{deskID:deskID, expiryTime:null}]})
      if(deskObj){
        res.status(200).send("Table added")
      }else{
        res.status(404).send("Table added unsuccessful")
      }
      
    }
  }
}

module.exports={
  get_desk_status,
  get_all_levels,
  add_desk
}