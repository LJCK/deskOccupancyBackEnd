const {newOccupancy, IoTData} = require("../models/desk")
const moment = require("moment");
const awsIot = require("aws-iot-device-sdk");
const dotenv = require("dotenv")
dotenv.config()

THRESHOLD_5_MINUTES = process.env.THRESHOLD_5_MINUTES
THRESHOLD_60_MINUTES = process.env.THRESHOLD_60_MINUTES
AWS_HOST_ID = process.env.AWS_HOST_ID

const device = awsIot.device({
  // clientId: 'RasperryMQTTClient',
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
let topic = "zigbee2mqtt/devices/#"; // # wildcard subscribes to all nested topics under zigbee2mqtt/devices (we use devices to distinguish messages, the friendly name naming convention should be devices/<sensorName>)
device.subscribe(topic);

//function definitions

function onMessage(topic, message) { //on message, logs data to mongoDB
  // this if condition is to prevent empty message crashing the backend
  if(message.toString('utf8')!=""){
    console.log("topic",topic)
    let topicComponents = topic.split("/")
    let sensorName = topicComponents[2]; //assuming friendly name follows convention of devices/<sensorName> (topic will have zigbee2mqtt in front)
    let payload = JSON.parse(message)
    logData(sensorName, new Date(), payload).catch(console.dir);
  }
}

async function logData(sensorID, timestamp, payload) { //writes the data to mongoDB
  if(payload.action ==="vibration" || payload.action ==="drop"){
    try {
      sensorName_array = sensorID.split("_")
      locationID = sensorName_array[0]+"_"+sensorName_array[1]
      let IoTObj = await IoTData({
          "timestamp": timestamp, //will write as UTC date - must handle coversion to SG time in application
          "metaData": {
            "sensorID": sensorID,
            "locationID": locationID,
            "status": payload.action,
          },
      })
      try{
        console.log(IoTObj)
        IoTObj.save()
        update_desk_status(locationID, sensorID)
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
  const allSensors = await newOccupancy.find({}).sort({"level":1})
  res.status(200).send(allSensors)
}

// const test =async()=>{
//   const testOnMessage =()=>{
//     device.on("message", function(topic, message, package){
//       console.log(topic)
//       console.log(JSON.parse(message))
//       console.log(package)
//     })
//   }
//   const floor = await newOccupancy.findOne({"_id":"nva_8"})
//   metaData = JSON.stringify({"tables":floor, "occupencyRatio":1/floor.desks.length*100})
//   device.publish(topic="bumGoWhere/frontend/update",payload = metaData, QoS=1)
//   device.subscribe(topic = "bumGoWhere/frontend/update",testOnMessage)
  
// }
// test()

const update_desk_status=async(locationID, sensorID)=>{
  const desk ={}
  desk["_id"]= locationID
  desk[`desks.${sensorID}`] = 
  const floor = await newOccupancy.findOne({"_id":locationID, })
  let num_of_occupied_table = 0
  if (floor != []){ // push table status into an array if exists 
    for(let item in floor.desks){
      let expiry_time = moment(floor.desks[item]["expiryTime"]);
      const deskID = floor.desks[item].deskID
      // console.log("checking deskID", deskID)
      if(floor.desks[item]["expiryTime"]===null || expiry_time.isBefore(moment.utc().local())){
        if(await compareDeskTimeseries(deskID, 5)){
          // console.log('change status to occupied')
          floor.desks[item]["status"]='occupied'
          floor.desks[item]['expiryTime']= moment.utc().local().add(2,'minutes')
          floor.desks[item]['skipTime'] = moment.utc().local().add(1,"minutes")
          num_of_occupied_table++
        }else{
          // console.log("change status to unoccupied")
          floor.desks[item]["status"]='unoccupied'
          floor.desks[item]['expiryTime']= null
          floor.desks[item]['skipTime'] = null
        }
      }else{
        num_of_occupied_table++
        skip_time = moment(floor.desks[item]["skipTime"])
        if(skip_time.isBefore(moment.utc().local())){
          if(await compareDeskTimeseries(deskID, 60)){
            // console.log("returned from 60 mins checking")
            floor.desks[item]['expiryTime']= moment.utc().local().add(2,'hours')
          }
        }
      }
    }
  }

  await newOccupancy.findOneAndUpdate({"_id":floor["_id"]}, floor)
  metaData = JSON.stringify({"tables":floor, "occupencyRatio":num_of_occupied_table/floor.desks.length*100})
  device.publish("bumGoWhere/frontend/update", payload = metaData, QoS=1)
}

const get_desk_status=async(req,res)=>{
  const query_level = req.query.level
  const floor = await newOccupancy.findOne({_id:query_level})
  let num_of_occupied_table = 0
  if (floor != []){ // push table status into an array if exists 
    for(let item in floor.desks){
      let expiry_time = moment(floor.desks[item]["expiryTime"]);
      const deskID = floor.desks[item].deskID
      // console.log("checking deskID", deskID)
      if(floor.desks[item]["expiryTime"]===null || expiry_time.isBefore(moment.utc().local())){
        if(await compareDeskTimeseries(deskID, 5)){
          // console.log('change status to occupied')
          floor.desks[item]["status"]='occupied'
          floor.desks[item]['expiryTime']= moment.utc().local().add(2,'minutes')
          floor.desks[item]['skipTime'] = moment.utc().local().add(1,"minutes")
          num_of_occupied_table++
        }else{
          // console.log("change status to unoccupied")
          floor.desks[item]["status"]='unoccupied'
          floor.desks[item]['expiryTime']= null
          floor.desks[item]['skipTime'] = null
        }
      }else{
        num_of_occupied_table++
        skip_time = moment(floor.desks[item]["skipTime"])
        if(skip_time.isBefore(moment.utc().local())){
          if(await compareDeskTimeseries(deskID, 60)){
            // console.log("returned from 60 mins checking")
            floor.desks[item]['expiryTime']= moment.utc().local().add(2,'hours')
          }
        }
      }
    }
  }

  await newOccupancy.findOneAndUpdate({"_id":floor["_id"]}, floor)
  res.status(200).send({tables : floor, occupencyRatio : num_of_occupied_table/floor.desks.length*100 })
}

async function compareDeskTimeseries(deskID, time){
  const now = new Date()
  const some_minutes_ago = new Date(now.setMinutes(now.getMinutes()-time)).toISOString()
  const records = await IoTData.find({"timestamp": {$gte: some_minutes_ago}, "metaData.sensorID":deskID })
  console.log("check past \n", time, " minutes")
  console.log("length of records\n", records.length)
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
  console.log("deskID ", deskID)
  try{
    let deskObj = await newOccupancy.findOne({_id: locationID,desks:{$elemMatch:{deskID:deskID}}})
    if(deskObj){
      res.status(409).send("Sensor ID already exists.")
    }else{
      const desks ={}
      desks[`desks.${deskID}`] = {deskID:deskID,status: null, expiryTime: null, skipTime:null}
      // console.log("temp ",temp)
      let deskObj = await newOccupancy.findOneAndUpdate({_id: locationID},{$set:desks})
      if(deskObj){
        res.status(200).send("Sensor added successful.")
      }else{
        console.log("No record in DB, now creating")
        const desks ={}
        desks["_id"] = locationID
        desks["location"] = location
        desks["level"] = level
        desks[`desks.${deskID}`] = {deskID:deskID,status: null, expiryTime: null, skipTime:null}
        let deskObj = await newOccupancy(desks)
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
  try{
    await newOccupancy.updateOne({_id: locationID,desks:{$elemMatch:{deskID:deskID}}},
      {'$pull':{desks:{deskID:deskID}}}) 
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