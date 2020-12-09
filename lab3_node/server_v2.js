// node.js and firestore House Example
// Nov. 2020, croftd

// from: https://firebase.google.com/docs/firestore/quickstart



// You will need to point to your own private .json fileconst firebase = require("firebase");
//const firebase = require("firebase");

var admin = require("firebase-admin");

var serviceAccount = require("./private/houses-ae993-firebase-adminsdk-5omzp-8a9489aa9f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://houses-ae993.firebaseio.com"
});

const db = admin.firestore();

const express = require('express'); 
const app = express();

// use embedded javascript (EJS) for view templates
app.set('view engine', 'ejs');

// this tells express where to look for .js files to use with EJS views
app.use(express.static('public'));

// Base url with just '/'
app.get('/', function(req, res) {
	console.log("Processing request");
	
	db.collection('houses').get()
    .then(res2 => {
        let houseArray = [];
        res2.forEach(doc => {
          houseArray.push(doc.data());
        });

        // Note: render defaults to the views folder!
        res.render('index.ejs', {houses: houseArray});			  

        // Note that res is from express responding to the original request
        console.log("Here is res: ");
        console.log(res);

        // res2 is the firestore response from Google
        console.log("Here is res2: ");
        console.log(res2);
    })
    .catch(err => { console.error(err) });
});

// note semi-colons

// Route to add a new house
app.post('/add', function(req, res) {
   console.log("Processing request to add a house...");

});

// If you request the base URL at port 3000, with /houses, this function will run
app.get('/houses', function(req, res) {
    //app.get(‘/houses', (req, res) => {
	console.log("Processing request");
	res.json({houses: "Here is a sample from the houses route"});
	
	db.collection('houses').get()
    .then(res2 => {
      res2.forEach(doc => {
        console.log("House: " + doc.id);
        const data = doc.data();
        console.log(data);

        // Example of accessing individual field of the data object:
        console.log("Here is the price: " + data.price);
      });
    })
    .catch(err => { console.error(err) });
});

app.listen(3000);
console.log("house app: server_v2.js listening on port 3000");
