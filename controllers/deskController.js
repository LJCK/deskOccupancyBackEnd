const {newOccupancy, IoTData} = require("../models/desk")
const moment = require("moment");
const awsIot = require("aws-iot-device-sdk");
const dotenv = require("dotenv")
dotenv.config()

THRESHOLD_5_MINUTES = process.env.THRESHOLD_5_MINUTES
THRESHOLD_60_MINUTES = process.env.THRESHOLD_60_MINUTES
AWS_HOST_ID = process.env.AWS_HOST_ID

const device = awsIot.device({
  host: AWS_HOST_ID,
  port: 8883,
  keyPath: './certs/private.pem.key',
  certPath: './certs/certificate.pem.crt',
  caPath: './certs/Amazon-root-CA-1.pem',
});

device.on("connect", function(){
  console.log("aws iot is connected")
});

//Handle connection errors
device.on("error", (error) => {
    console.log("Can't connect" + error);
    process.exit(1);
})

//Set onMessage callback
device.on("message", onMessage)

//Subscribe to topic 
// # wildcard subscribes to all nested topics under zigbee2mqtt/devices (we use devices to distinguish messages, the friendly name naming convention should be devices/<sensorName>)
device.subscribe("zigbee2mqtt/devices/#");


function onMessage(topic, message) { 
  // on message, logs data to mongoDB
  // this if condition is to prevent empty message crashing the backend
  if(message.toString('utf8')!=""){
    let topicComponents = topic.split("/")
    let sensorName = topicComponents[2]; //assuming friendly name follows convention of <sensorType>_<sensorName>
    let payload = JSON.parse(message)

    const sensorType = sensorName.split("_")[2]
    //only log the data if it's from vibration sensor
    if(sensorType === "vibration"){
      logData(sensorName, new Date(), payload).catch(console.dir);
    }
  }
}

async function logData(sensorID, timestamp, payload) { //writes the data to mongoDB
  
  if(payload.vibration === true && (payload.action ==="vibration" || payload.action ==="tilt" || payload.action ==="drop")){
    try {
      sensorName_array = sensorID.split("_")
      locationID = sensorName_array[0]+"_"+sensorName_array[1]
      let IoTObj = await IoTData({
          "timestamp": timestamp, //will write as UTC date - must handle coversion to SG time in application
          "metaData": {
            "sensorID": sensorID,
            "locationID": locationID,
            "vibration": payload.vibration,
          },
      })
      try{
        console.log("received a vibration:\n",IoTObj)
        IoTObj.save()
        update_desk_status(locationID)
        console.log('Logged the data')
      }
      catch(error){
        console.log("Logging data went wrong:\n", error)
      }
    }catch(error){
      console.log(error)
    }
  }
}

const get_all_sensors = async(req,res)=>{
  const allSensors = await newOccupancy.find({})
  res.status(200).send(allSensors)
}

const update_desk_status=async(locationID)=>{
  const floor = await newOccupancy.findOne({"_id":locationID})
  let num_of_occupied_table = 0
  let num_of_vibration_sensor = 0
  console.log("updating vibrated sensor")
  if (floor != []){ 
    for(let item of floor.desks){
    
      // skip non vibration type sensors
      console.log("updating sensor\n", item)
      if(item["sensorType"] != "vibration"){
        return
      }
      
      num_of_vibration_sensor++

      let expiry_time = moment(item["expiryTime"]);
      const deskID = item.deskID

      // this is to check if the table is unoccupied
      if(item["expiryTime"]===null || expiry_time.isBefore(moment.utc().local())){
        if(await compareDeskTimeseries(deskID, 5)){
          // console.log('change status to occupied')
          item["status"]='occupied'
          item['expiryTime']= moment.utc().local().add(4,'hours')
          item['skipTime'] = moment.utc().local().add(1,"hours")
          num_of_occupied_table++
        }else{
          // console.log("change status to unoccupied")
          item["status"]='unoccupied'
          item['expiryTime']= null
          item['skipTime'] = null
        }
      }else{
        num_of_occupied_table++
        skip_time = moment(item["skipTime"])
        if(skip_time.isBefore(moment.utc().local())){
          if(await compareDeskTimeseries(deskID, 60)){
            // console.log("returned from 60 mins checking")
            item['expiryTime']= moment.utc().local().add(4,'hours')
          }
        }
      }
    }
  }
  floor.numOfVibrationSensors = num_of_vibration_sensor, 
  floor.occupiedSensors = num_of_vibration_sensor - num_of_occupied_table

  await newOccupancy.findOneAndUpdate({"_id":locationID}, floor)
  
  metaData = JSON.stringify({"tables":floor})
  device.publish(`bumGoWhere/frontend/update/${floor["_id"]}`, payload = metaData, QoS=1)
  console.log("push data to frontend")
}

const get_desk_status = async(req,res)=>{
  const query_level = req.query.level
  const floor = await newOccupancy.findOne({_id:query_level})
  if(floor){
    res.status(200).send({table: floor})
  }else{
    res.status(404).send("No desk record found in database")
  }
}

// const get_desk_status=async(req,res)=>{
//   const query_level = req.query.level
//   const floor = await newOccupancy.findOne({_id:query_level})
//   console.log("updating all sensors")
//   // calculate the number of vibration sensor and the number of occupied table
//   let num_of_occupied_table = 0
//   let num_of_vibration_sensor = 0

//   if (floor != []){ // push table status into an array if exists 
//     for(let item of floor.desks){
//       console.log("updating sensor\n", item)
//       if(item["sensorType"] != "vibration"){
//         break
//       }
//       num_of_vibration_sensor++

//       let expiry_time = moment(item["expiryTime"]);
//       const deskID = item.deskID

//       // this is to check if the table is unoccupied
//       if(item["expiryTime"]===null || expiry_time.isBefore(moment.utc().local())){
//         if(await compareDeskTimeseries(deskID, 5)){
//           // console.log('change status to occupied')
//           item["status"]='occupied'
//           item['expiryTime']= moment.utc().local().add(4,'hours')
//           item['skipTime'] = moment.utc().local().add(1,"hours")
//           num_of_occupied_table++
//         }else{
//           // console.log("change status to unoccupied")
//           item["status"]='unoccupied'
//           item['expiryTime']= null
//           item['skipTime'] = null
//         }
//       }else{
//         num_of_occupied_table++
//         skip_time = moment(item["skipTime"])
//         if(skip_time.isBefore(moment.utc().local())){
//           if(await compareDeskTimeseries(deskID, 60)){
//             // console.log("returned from 60 mins checking")
//             item['expiryTime']= moment.utc().local().add(4,'hours')
//           }
//         }
//       }
//     }
//   }

//   await newOccupancy.findOneAndUpdate({_id:query_level}, floor)
//   res.status(200).send({tables : floor, occupencyRatio : `${num_of_vibration_sensor-num_of_occupied_table}/${num_of_vibration_sensor}` })
//   console.log("push data to frontend")

//   // floor.save(function(error){
//   //   if(error){
//   //     console.log("Save updated desk status using API went wrong with error \n", error )
//   //   }else{
//   //     res.status(200).send({tables : floor, occupencyRatio : `${num_of_occupied_table} out of ${num_of_vibration_sensor}` })
//   //   }
//   // })
// }

async function compareDeskTimeseries(deskID, time){
  const now = new Date()
  const some_minutes_ago = new Date(now.setMinutes(now.getMinutes()-time)).toISOString()
  const records = await IoTData.find({"timestamp": {$gte: some_minutes_ago}, "metaData.sensorID":deskID })
  console.log("check past ", time, " minutes")
  console.log("length of records ", records.length)
  if(time === 5){
    if(records.length > THRESHOLD_5_MINUTES){
      return true
    }else{
      return false
    }
  }else{
    if(records.length > THRESHOLD_60_MINUTES){
      return true
    }else{
      return false
    }
  }
}

const get_all_levels=async(req,res)=>{
  const location = req.query.location
  const floors = await newOccupancy.find({location: location}).sort({"level":1})
  res.send(floors)
}

const add_desk=async(req,res)=>{
  const deskID = req.body.deskID
  const location = req.body.location
  const locationID = req.body.locationID
  const level = req.body.level
  const sensorType = req.body.sensorType
  console.log("deskID ", deskID)
  try{
    let deskObj = await newOccupancy.findOne({_id: locationID,desks:{$elemMatch:{deskID:deskID}}})
    if(deskObj){
      res.status(409).send("Sensor ID already exists.")
    }else{
      
      // console.log("temp ",temp)
      let deskObj = await newOccupancy.findOneAndUpdate({_id: locationID},{$push:{"desks":{deskID:deskID,status: null, sensorType: sensorType, expiryTime: null}}})
      if(deskObj){
        res.status(200).send("Sensor added successful.")
      }else{
        console.log("No record in DB, now creating")
        let deskObj = await newOccupancy({_id:locationID, location:location, level:level,desks:[{deskID:deskID,status: null, sensorType: sensorType, expiryTime: null}], numOfSensors:0, occupiedSensors:0})
        try{
          deskObj.save()
          res.status(200).send("Sensor added successful.")
        }
        catch{
          res.status(404).send("Sensor added unsuccessful")
        }
      }
    }
  }catch(error){
    console.log("error\n",error)
  }
}

const delete_desk = async(req,res)=>{

  const locationID = req.body.locationID
  const deskID = req.body.deskID
  // try{
  //   const data = {}
  //   data["_id"] = locationID
  //   data[`desks.${deskID}`] = ""
  //   const unset = {}
  //   unset[`desks.${deskID}`] = ""
  //   // const temp = await newOccupancy.findOne({data})
  //   // console.log(temp)
  //   const temp = await newOccupancy.updateOne({data},
  //     {'$unset':unset}) 
  //   console.log(temp)
  //   res.status(200).send("Sensor removed.")
  try{
    console.log("remove ", deskID)
    await newOccupancy.updateOne({"_id": locationID,"desks":{"$elemMatch":{"deskID":deskID}}},
      {'$pull':{"desks":{"deskID":deskID}}}) 
    console.log("removed one table")
    res.status(200).send("Sensor removed.")
  }catch(error){
    res.send("error")
  }
}

module.exports={
  get_desk_status,
  get_all_levels,
  get_all_sensors,
  add_desk,
  delete_desk
}