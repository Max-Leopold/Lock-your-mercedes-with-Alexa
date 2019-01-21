const Alexa = require('ask-sdk');
const fetch = require('node-fetch'); 
const async = require('async');

/**
 * This is a skript for a Amazon Alexa Skill
 * 
 * This skill lets you lock the doors of your mercedes car by saying: "Alexa lock my mercedes!";
 */

/**
 * Handler for the LaunchRequest and the 'LockMyMercedes' Intent
 */
const LockMyMercedesHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'LockMyMercedes');
  },
  async handle(handlerInput) {

    //Communication with mercedes API
    //start

    //Look for accessToken object in json Input
    //If there is no accessToken -> user has to login first
    //If there is a accessToken -> lock his car
    const { accessToken } = handlerInput.requestEnvelope.context.System.user;
    console.log(accessToken);


    if(!accessToken) {
      const speechOutput = 'You must first login to your mercedes account';

      //Let the user login with his mercedes account
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {

    //Extract the access token from the json input
    var access_token = handlerInput.requestEnvelope.context.System.user.accessToken;
    
    //Get the vehicle if via the access token
    var vehicle_id = await getVehicleId();
  
    console.log(access_token);

    //This variable is used to store if your car is locked
    //false = unlocked
    //true = locked
    var locked = false;

    /**
     * This function returns the vehicle id of a users car.
     * The vehicle if is retrieved via the access token
     */
    async function getVehicleId() {
      //Fetch the vehicle id
      var res = await fetch('https://api.mercedes-benz.com/experimental/connectedvehicle/v1/vehicles', {
        method: 'get',
        headers:{
          'accept': 'application/json',
          'Authorization': 'Bearer ' + access_token
        }
      });
      //Convert the result to json
      var result = await res.json();
      console.log(result);
      //return the vehicle id
      return result[0]['id'];
    }

    /**
     * This function is the start function of the programm.
     * This function gets called, to start the whole process of locking the doors of a car.
     * The function calls the checkDoorStatus() function and waits for a boolean return.
     * If the checkDoorStatus() function returns true, that means all doors are now locked.
     * If the checkDoorStatus() function returns false, that means there was an error communicating with the API/car
     */
    async function start() {
      //Check the status of the doors 
      var locked = await checkDoorStatus();
      if(locked == true){
        return 'Your car has been locked.';
      }else {
        return 'There was an error communicating with your car. Your car has not been locked.';
      }
    }
    
    /**
     * This function is used to check the door status of a vehicle.
     * It checks the doorlockstatusvehicle value. This value indicates, if all doors of a vehicle are locked or if there
     * is a minimum of one door not locked.
     * When all doors are locked this function returns true.
     * If a minimum of one door isnt locked, this function calls the lockAllDoors() function to lock the doors
     */
    async function checkDoorStatus() {
      //Get command to get the door status of a vehicle 
      var res = await fetch('https://api.mercedes-benz.com/experimental/connectedvehicle/v1/vehicles/' + vehicle_id + '/doors', {
        method: 'get',
        headers: {
          'accept': 'application/json',
          'Authorization': 'Bearer ' + access_token
        }
      });
      //Turn the result into json format
      var result = await res.json();
      console.log(result);
      //If the lock status of the vehicle is locked return true
      if (result.doorlockstatusvehicle.value == 'LOCKED') {
        console.log('All doors locked');
        locked = true;
        console.log('Locked? ' + locked);
        return true;
      } 
      //Else lock the doors
      else {
        return await lockAllDoors();
      }
    }
    
    /**
     * This function sends a post fetch to the vehicle to get lock all doors. 
     * The result of this step is only a INITIATED message.
     * To verify, if the doors are locked the checkDoorStatus() function is called again.
     * If all the doors are locked the checkDoorStatus() function will return true. This result
     * will also be returned by the lockAllDoors().
     */
    async function lockAllDoors() {
      //Post command to lock all doors of a specific vehicle
      var res = await fetch('https://api.mercedes-benz.com/experimental/connectedvehicle/v1/vehicles/' + vehicle_id + '/doors', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + access_token
        },
        body: '{ \"command\": \"LOCK\"}'
      });
      //Parse the result to json format
      var result = await res.json();
      //To verify, that all doors are locked, check the door status
      return await checkDoorStatus();
    }
    
    //Starts the program
    const speechOutput = await start();
    
    console.log('response:' + speechOutput);

    //Communication with the mercedes API
    //End

    //Return the speechOutput for Alexa, based on the result of the start function
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
    }
},
};

//=======================================================
// Standard Alexa intents
//=======================================================

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, we coudnt connect with your car. Error')
      .reprompt('Sorry, we coudnt connect with your car. Error')
      .getResponse();
  },
};

const SKILL_NAME = 'Lock My Mercedes';
const HELP_MESSAGE = 'Say Lock my car to get your car locked.';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LockMyMercedesHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
