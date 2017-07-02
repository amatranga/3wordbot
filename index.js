const Twitter = require('twitter');
const Swagger = require('swagger-client')
const config = require('./config') || null;

const WORDNIK_API_KEY = process.env.WordnikAPI;
const what3wordsAPI = process.env.What3Words;
const staticMapsAPI = process.env.staticMapsKey;

const twitterKeys = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token_key,
  access_token_secret: process.env.access_token_secret
}

const bot = new Twitter(twitterKeys);

const wordRequest = {
  url: `http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=true&includePartOfSpeech=noun&adjective&verb&adverb&excludePartOfSpeech=proper-noun&minCorpusCount=1000000&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=4&maxLength=-1&limit=3&api_key=${WORDNIK_API_KEY}`,
  method: 'GET'
};

const separateWords = (arrOfWords, separator, min) => {
  let _out = '';
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

Swagger.http(wordRequest)
.then((res) => {
  res.body.forEach(wordObj => words.push(wordObj.word.toLowerCase()));
})
.then(() => {
  geoRequest = {
    url: `https://api.what3words.com/v2/forward?addr=${separateWords(words, '.', 1)}&key=${what3wordsAPI}`,
    method: 'GET'
  };
})
.then(() => {
  Swagger.http(geoRequest)
  .then((response) => {
    geometry = response.body.geometry;
  })
  .then(() => {
    isValidLocation = geometry !== undefined
  })
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
      .then(() => {
        tweet = '#' + separateWords(words, ' | #', 3);
      })
      .then(() => {
        bot.post('media/upload', {media: map}, (err, media, res) => {
          if (!err) {
            mediaId = media.media_id_string;
            status = {
              status: tweet,
              lat: geometry.lat,
              lon: geometry.lng,
              display_coordinates: true,
              media_ids: mediaId
            };
            bot.post('statuses/update', status, (err, tweet, res) => {
              if (!err) {
                console.log('TWEETED', status);
              } else {
                console.log(err, 'Error tweeting')
              }
            });
          }
        });
      })
      .catch((err) => {
        console.log(err, 'Error with map');
      });
    }
  })
  .catch((err) => {
    console.log(err, 'Error in geoRequest');
  });
})
.catch((err) => {
  console.log('ERROR', err);
});
