const Twitter = require('twitter');
const Swagger = require('swagger-client')
// const config = require('./config');

const WORDNIK_API_KEY = process.env.WordnikAPI;
const what3wordsAPI = process.env.What3Words;
const staticMapsAPI = process.env.staticMapsKey;

const twitterKeys = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token_key,
  access_token_secret: process.env.access_token_secret
};

const bot = new Twitter(twitterKeys);

const wordRequest = {
  url: `http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=true&includePartOfSpeech=noun&adjective&verb&adverb&excludePartOfSpeech=proper-noun&minCorpusCount=1000000&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=4&maxLength=-1&limit=3&api_key=${WORDNIK_API_KEY}`,
  method: 'GET'
};

//Takes an array of words and turns them into a string. Each word will be separated by the specified separator
//Optionally, 'min' will slice the specified number of characters from the end of the string.
const separateWords = (arrOfWords, separator, min) => {
  let _out = '';
  if (min === undefined) { min = 0; }
  arrOfWords.forEach((word) => _out += word + separator);
  return _out.slice(0, _out.length - min);
};

let words = [];
let geoRequest;
let geometry;
let isValidLocation;
let map;
let mediaId;
let status;
let tweet;
let statusId;

//First, get three random words. The words will come from Wordnik's API
Swagger.http(wordRequest)
.then((res) => {
  res.body.forEach(wordObj => words.push(wordObj.word.toLowerCase()));
})

//Once the three random words are returned, they are passed to What3Words' API
.then(() => {
  geoRequest = {
    url: `https://api.what3words.com/v2/forward?addr=${separateWords(words, '.', 1)}&key=${what3wordsAPI}`,
    method: 'GET'
  };
})

//If What3Words provides a valid response, a geometry object will be found on the response.body.
//Not every combination of 3 words will result in a geo-location. 
.then(() => {
  Swagger.http(geoRequest)
  .then((response) => {
    geometry = response.body.geometry;
  })
  .then(() => {
    isValidLocation = geometry !== undefined
  })

  //If the location is valid, the latitude and longitude will be sent to Google's Static Maps API.
  //The resulting buffer will then be stored
  .then(() => {
    if (isValidLocation) {
      map = {
        url: `https://maps.googleapis.com/maps/api/staticmap?center=${geometry.lat},${geometry.lng}&zoom=5&size=600x600&markers=color:red%7C${geometry.lat},${geometry.lng}&key=${staticMapsAPI}`,
        method: 'GET'
      }
      Swagger.http(map)
      .then((resp) => {
        map = resp.text;
        mapSize = resp.headers['content-length'];
      })

      //Format the 3 words in preparation for tweeting
      .then(() => {
        tweet = separateWords(words, ' | ', 2);
      })
      
      //Before the map sent back from Google Static Maps can be uploaded, Twitter has to format it
      .then(() => {
        bot.post('media/upload', {media: map}, (err, media, res) => {
          if (!err) {
            mediaId = media.media_id_string;
            status = {
              status: tweet,
              lat: geometry.lat,
              long: geometry.lng,
              display_coordinates: true,
              media_ids: mediaId
            };
      
            //The formatted map and tweet are then tweeted
            bot.post('statuses/update', status, (err, tweet, res) => {
              if (!err) {
                console.log('TWEETED', status);
              } else {
                console.log(err, 'Error tweeting')
              }
            //Let's try out replying to ourselves. For now, we will just say that this post was automatically created
            //First, we need to get the status id
              bot.get('statuses/user_timeline', { screen_name: '3wordBot', count: 1 }, (err, tweet, res) => {
                if (!err) {
                  statusId = (JSON.parse(res.body))[0].id_str;
                  bot.post('statuses/update', { status: '@3wordBot This tweet was automagically created', in_reply_to_status_id: statusId}, (err, tweet, res) => {
                    if (!err) {
                      console.log('REPLIED!');
                    } else {
                      console.log(err, 'Error replying');
                    }
                  });
                }
              });
            });
          }
        });
      })
      
      //An error at this point means that there was a problem with Google Static Maps API
      .catch((err) => {
        console.log(err, 'Error with map');
      });
    }
  })
  
  //An error at this point means that there was a problem with the geo-location request
  .catch((err) => {
    console.log(err, 'Error in geoRequest');
  });
})

//Finally, any other errors will be handled here
.catch((err) => {
  console.log('ERROR', err);
});
