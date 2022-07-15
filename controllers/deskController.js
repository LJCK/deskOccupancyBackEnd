const {newOccupancy} = require("../models/desk")
const moment = require("moment");

const get_desk_status=async(req,res)=>{
  const query_level = req.query.level
  const floor = await newOccupancy.findOne({level:query_level})
  occupancy_status={}
  for(let desk_id in floor.desks){
    let expiry_time = moment(floor.desks[desk_id]["expiryTime"],"hh:mm:ss");
    console.log(expiry_time)
    if(floor.desks[desk_id]["expiryTime"]===null || expiry_time.isBefore(moment.utc().local())){
      occupancy_status[desk_id]='unoccupied'
    }else{
      occupancy_status[desk_id]='occupied'
    }
  }
  
  res.send(occupancy_status)
}

const get_all_levels=async(req,res)=>{
  const floors = await newOccupancy.find()
  levels=[]
  floors.forEach((floor)=>{
    levels.push(floor.level)
  })
  res.send(levels)
}

module.exports={
  get_desk_status,
  get_all_levels
}