const {newOccupancy} = require("../models/desk")
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

const get_desk_status=async(req,res)=>{
  const query_level = req.query.level
  console.log(query_level)
  const floor = await newOccupancy.findOne({_id:query_level})
  
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
        res.status(200).send("Table added")
      }else{
        console.log("No record in DB, now creating")
        let deskObj = await newOccupancy({_id:locationID, location:location, level:level,desks:[{deskID:deskID, expiryTime:null}]})
        try{
          deskObj.save()
          res.status(200).send("Table added")
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

const permit_join=(req,res)=>{
  
  device.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": true }', { "qos": 1 }, onPermitJoin);
  
  function onPermitJoin(err) {
    if (err) {
      console.log("Error occured: " + err);
      console.log("Closing device...");
      device.end();
    }
    else {
      onSubscribe()
      // device.subscribe("zigbee2mqtt/bridge/event", null, onSubscribe) //subscribe to MQTT topic
    }
  }

  function onSubscribe(err, granted) {
    if (err) {
      console.log("Error occured: " + err);
      console.log("Closing device...");
      res.status(409).send(err)
      return
      device.end();
    }
    else {
      console.log("You may now pair your device.")
      res.status(200).send("You may now pair your device, please follow the following steps.1)You need to be physically beside the IoT Hub. 2)Press and hold the button on the sensor until the blinking light stops")
      return 
      console.log("You may now pair your device") //ready for pairing
    }
  }
}

const pairDevice=async(req,res)=>{

  const deskID = req.body.deskID
  const location = req.body.location
  const locationID = req.body.locationID
  const level = req.body.level
  console.log("received a request: \n", req.body)
  device.subscribe("zigbee2mqtt/bridge/event", null, onSubscribe) //subscribe to MQTT topic
  
  function onSubscribe(){
    console.log("subscribed to the topic zigbee2mqtt/bridge/event")
    device.on("message", onMessage)
  }
  // device.on("message", onMessage)
    async function onMessage(topic, message, packet) {
      
      let messageObj = JSON.parse(message)
      console.log("received message\n",messageObj)

      let deskObj = await newOccupancy.findOne({_id: locationID,desks:{$elemMatch:{deskID:deskID}}})
      if(deskObj){
        device.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": false }');
        console.log("send res due to sensor already exists", deskID)
        res.status(409).send("Sensor for this table is already exists.")
        res.end()
        return
      }else if (topic == "zigbee2mqtt/bridge/event" && messageObj.type == "device_interview") {
        switch (messageObj.data.status) {
          case "started":
            console.log("Device interview commencing. Please wait... (You might see this multiple times as device pairs)");
            console.log("The request body is ",req.body)
            console.log("The saved name is ", deskID)
            break;
          case "failed":
            device.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": false }');
            console.log("send res due to pairing fail", deskID)
            res.status(502).send("Device interview failed, please try again...")
            res.end()
            return
            break;
          case "successful": //on pairing...
            let friendly_name = messageObj.data.friendly_name;
            new_friendly_name = deskID
            if (new_friendly_name != "") {
                device.publish("zigbee2mqtt/bridge/request/device/rename", `{ "from": "${friendly_name}", "to": "devices/${new_friendly_name}" }`, null, onRename)
            }
        }
      }
    }

    async function onRename(err) {
      if (err) {
        device.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": false }');
        console.log("send res due to rename fail", deskID)
        res.status(502).send(err)
        res.end()
        return
      }
      else {
        // console.log("Successfully renamed!")
        device.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": false }');
        try{
          let deskObj = await newOccupancy.findOneAndUpdate({_id: locationID},{'$push':{"desks":{deskID:deskID,expiryTime:null}}})
          if(deskObj){
            console.log("send res due to sensor added to db", deskID)
            res.status(200).send("Sensor successfully added")
            res.end()
            return
  
          }else{
            // No record in DB, now creating
            let deskObj = await newOccupancy({_id:locationID, location:location, level:level,desks:[{deskID:deskID, expiryTime:null}]})
            try{
              deskObj.save()
              console.log("send res due to created new db", deskID)
              res.status(200).send("Sensor successfully added")
              res.end()
              return 
            }
            catch{
  
              res.status(409).send("Fails to save sensor into database")
              res.end()
              return
            }
          }
        }catch(error){console.log(error)}
         
      }
    }
}

module.exports={
  get_desk_status,
  get_all_levels,
  add_desk,
  permit_join,
  pairDevice
}