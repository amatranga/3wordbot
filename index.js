const Twitter = require('twitter');
const Swagger = require('swagger-client')
const config = require('./config');

const WORDNIK_API_KEY = config.WordnikAPI;

const bot = new Twitter(config);
const request = {
  url: `http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=true&&minLength=5&limit=3&api_key=${WORDNIK_API_KEY}`,
  method: 'GET'
};

let words = [];

Swagger.http(request)
.then((res) => {
  res.body.forEach(wordObj => words.push(wordObj.word));
  console.log(words);
})
.catch((err) => {
  console.log('ERROR', err);
});
