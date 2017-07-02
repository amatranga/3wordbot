const Twitter = require('twitter');
const Swagger = require('swagger-client')
const config = require('./config');

const WORDNIK_API_KEY = config.WordnikAPI;
const what3wordsAPI = config.What3Words;

const bot = new Twitter(config);

const wordRequest = {
  url: `http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=true&excludePartOfSpeech=proper-noun&minCorpusCount=1000000&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=4&maxLength=-1&limit=3&api_key=${WORDNIK_API_KEY}`,
  method: 'GET'
};

let words = [];
let geoRequest;
let bounds;
let geometry;

const dotSeparatedWords = (arrOfWords, _out) => {
  _out = '';
  arrOfWords.forEach((word) => _out += word + '.');
  return _out.slice(0, _out.length - 1);
};

Swagger.http(wordRequest)
.then((res) => {
  res.body.forEach(wordObj => words.push(wordObj.word));
  console.log(words);
})
.then(() => {
  geoRequest = {
    url: `https://api.what3words.com/v2/forward?addr=${dotSeparatedWords(words)}&key=${what3wordsAPI}`,
    method: 'GET'
  };
})
.then(() => {
  console.log(geoRequest.url);
})
.then(() => {
  Swagger.http(geoRequest)
  .then((response) => {
    bounds = response.body.bounds;
    geometry = response.body.geometry;
  })
  .then(() => {
    console.log(bounds, 'BODY');
    console.log(geometry, 'GEOMETRY');
  })
  .catch((err) => {
    console.log(err, 'Error in geoRequest');
  });
})
.catch((err) => {
  console.log('ERROR', err);
});
