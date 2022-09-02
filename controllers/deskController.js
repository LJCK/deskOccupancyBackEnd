const {newOccupancy, IoTData} = require("../models/desk")
const moment = require("moment");
const awsIot = require("aws-iot-device-sdk")

const device = awsIot.device({
  clientId: 'RasperryMQTTClient',
  host: 'a2x864rhawhdg9-ats.iot.ap-southeast-1.amazonaws.com',
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
    let topicComponents = topic.split("/")
    let sensorName = topicComponents[2]; //assuming friendly name follows convention of devices/<sensorName> (topic will have zigbee2mqtt in front)
    let payload = JSON.parse(message)
    logData(sensorName, new Date(), payload).catch(console.dir);
  }
}

async function logData(sensorName, timestamp, payload) { //writes the data to mongoDB
  if(payload.action ==="vibration" || payload.action ==="drop"){
    try {
      sensorName_array = sensorName.split("_")
      locationID = sensorName_array[0]+"_"+sensorName_array[1]
      let IoTObj = await IoTData({
          "timestamp": timestamp, //will write as UTC date - must handle coversion to SG time in application
          "metaData": {
            "sensorID": sensorName,
            "locationID": locationID,
            "status": payload.action,
          },
      })
      try{
        console.log(IoTObj)
        IoTObj.save()
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

const get_desk_status=async(req,res)=>{
  const query_level = req.query.level
  console.log(query_level)
  const floor = await newOccupancy.findOne({_id:query_level})
  console.log("floor",floor)

  occupancy_array=[]
  if (floor != []){ // push table status into an array if exists 
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
  }
  res.send(occupancy_array)
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

  try{
    let deskObj = await newOccupancy.findOne({_id: locationID,desks:{$elemMatch:{deskID:deskID}}})
    if(deskObj){
      res.status(409).send("Table ID already exists.")
    }else{
      let deskObj = await newOccupancy.findOneAndUpdate({_id: locationID},{'$push':{"desks":{deskID:deskID,expiryTime: null}}})
      if(deskObj){
        console.log("DB updated")
        res.status(200).send("Hold the button on the sensor until it stop blinking")
      }else{
        console.log("No record in DB, now creating")
        let deskObj = await newOccupancy({_id:locationID, location:location, level:level,desks:[{deskID:deskID, expiryTime:null}]})
        try{
          deskObj.save()
          res.status(200).send("Hold the button on the sensor until it stop blinking")
        }
        catch{
          res.status(404).send("Table added unsuccessful")
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
  // permit_join,
  // pairDevice
}