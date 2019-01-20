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

    //Communication with the mercedes API
    //Start
    
    //=======================================================
    // Plase provide the variables in this paragraph
    //=======================================================
    /**
    * You can get your vehicle_id by visiting the car simulator:
    * https://car-simulator.developer.mercedes-benz.com/
    * You can find your vehicle id in the top left corner
    * */
    var vehicle_id = '9CE2C8302183ADBD1A';
    
    /**
    * You can obtain the authorization code, by visiting this website:
    * https://api.secure.mercedes-benz.com/oidc10/auth/oauth/v2/authorize?response_type=code&client_id=6f50c8c8-d8c2-4f21-b228-dc5f70197047&redirect_uri=http://localhost&scope=mb:vehicle:status:general mb:user:pool:reader
    * You will have to log in to your mercedes developer account
    * You will get redirected to url, following this scheme:
    * http://localhost/?code=9217fd84-2600-4c1f-acfe-88a8f16d2f24
    * Please set the variable authorization_code to the part of the url following ?code=
    * You will have to provide this Varibale new every time you run the application
    * */
    var authorization_code = 'fcbaf99f-d897-439d-89a3-f109f089ca0b';

    //=======================================================
    // End
    //=======================================================

    /**
     * Client id and Client secret of the application.
     * These two keys should normally be held secret and should only be known by the authentification server
     * and the application backend, but since I didnt programmed a backend 
     * to save these two in, they are stored as variables in the programm.
     */
    const client_id = "6f50c8c8-d8c2-4f21-b228-dc5f70197047";
    const client_secret = "b6f1a42d-1ac6-419f-9112-ce8a7f717d7c";

    //The client id and client sercret must be encoded in base64 to fetch an access token
    const encoded_all = Buffer.from(client_id + ':' + client_secret).toString('base64');

    var refresh_token; 
    var access_token;

    //This variable is used to store if your car is locked
    //false = unlocked
    //true = locked
    var locked = false;

    /**
     * This function accepts an authetification code as parameter. This authetification code must be
     * provided by the user using the software. This software cant fetch an authorization code on her own.
     * 
     * After requesting the access token from the server via the authentification code.
     * When the authentification code was valid, the access token and refresh token are extracted from
     * the result of the request.
     * This acces token is then used to check if the doors of your car are locked via the checkDoorStatus() function.
     * This function then return true (= locked) or false (= unlocked). Based on this the fetchAccessToken() function
     * return a String which is used as Alexas speechOutput.
     * 
     * @param {authetification code} code 
     */
    async function fetchAccesToken(code) {

      var res = await fetch('https://api.secure.mercedes-benz.com/oidc10/auth/oauth/v2/token', {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + encoded_all
        },
        body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=http://localhost'
      }
      )
        
      var result = await res.json();
      console.log(result);
        
      if (result.error == 'invalid_grant') {
          console.log('The given authorization code was invalid or already used');
          return 'Sorry we couldnt connect to your car. Please lock your car by yourself'
        } else {
          console.log('The given grant is valid. Trying to connect to the car');
          refresh_token = result['refresh_token'];
          access_token = result['access_token'];
          //return 'Your car has been locked';
          var locked = await checkDoorStatus();
          if(locked == true){
            return 'Your car has been locked.';
          }else {
            return 'There was an error communicating with your car. Your car has not been locked.';
          }
        }
    }

    /**
     * Fetches the door status of the given vehicle.
     * If the doors are all already locked the function return true to indicate that the doors are locked.
     * If a minimum of one door is not locked the function calls the lockAllDoors() function to get all doors locked.
     * To verify if a door is not locked the function analyzes the result of the fetch and checks for the 
     * doolockstatusvehcle attribute of the json object. If the value of this attribute if LOCKED, then all doors are locked.
     * If the value is UNLOCKED the vehicle is not completly locked.
     */
    async function checkDoorStatus() {
      var res = await fetch('https://api.mercedes-benz.com/experimental/connectedvehicle/v1/vehicles/' + vehicle_id + '/doors', {
        method: 'get',
        headers: {
          'accept': 'application/json',
          'Authorization': 'Bearer ' + access_token
        }
      })
        
        var result = await res.json();
        console.log(result);
        //console.log(result);
        if (result.doorlockstatusvehicle.value == 'LOCKED') {
          console.log('All doors locked');
          locked = true;
          console.log('Locked? ' + locked);
          return true;
        } else {
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
      var res = await fetch('https://api.mercedes-benz.com/experimental/connectedvehicle/v1/vehicles/' + vehicle_id + '/doors', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + access_token
        },
        body: '{ \"command\": \"LOCK\"}'
      })

        var result = await res.json();
        return await checkDoorStatus();
      }
    
    /**
     * This method is never used.
     * 
     * Idea of this function was to use a DynamoDB database to store a refresh token and dont
     * fetch a ne acces token every time the intent gets triggered via the authorization code, but get 
     * a new acces token via the refresh token that is saved in the DynamoDB database.
     */
    function refreshToken() {
      console.log(refresh_token);
      fetch('https://api.secure.mercedes-benz.com/oidc10/auth/oauth/v2/token', {
        method: 'post',
        headers: {
          'Authorization': 'Basic ' + encoded_all,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=refresh_token&refresh_token=' + refresh_token
      }).then(res => res.json()).then(result => {
        refresh_token = result['refreshToken'];
        access_token = result['access_token'];
      }).then(setTimeout(refreshToken, 3500000));
    }

    const speechOutput = await fetchAccesToken(authorization_code);
    console.log('response:' + speechOutput);

    //Communication with the mercedes API
    //End

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
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
      .speak('Sorry, we coudnt connect with your car.')
      .reprompt('Sorry, we coudnt connect with your car.')
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
