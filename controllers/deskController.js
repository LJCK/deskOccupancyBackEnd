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
  console.log(req.body.data)
}

module.exports={
  get_desk_status,
  get_all_levels,
  add_desk
}