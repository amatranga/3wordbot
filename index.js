const Twitter = require('twitter');
const Swagger = require('swagger-client')
const config = require('./config');

const WORDNIK_API_KEY = config.WordnikAPI;
const what3wordsAPI = config.What3Words;
const staticMapsAPI = config.staticMapsKey;

const bot = new Twitter(config);

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
let mapSize;

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
    console.log(geometry, 'GEOMETRY');
    isValidLocation = geometry !== undefined
  })
  .then(() => {
    if (isValidLocation) {
      map = {
        url: `https://maps.googleapis.com/maps/api/staticmap?center=${geometry.lng}, ${geometry.lat}&zoom=14&size=600x600&maptype=satellite&key=${staticMapsAPI}`,
        method: 'GET'
      }
      Swagger.http(map)
      .then((resp) => {
        map = resp.text;
        mapSize = resp.headers['content-length'];
      })
      .then(() => {
        console.log(map, 'MAP');
        console.log(mapSize, 'MAPSIZE');
        console.log(separateWords(words, ' | ', 2));
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
