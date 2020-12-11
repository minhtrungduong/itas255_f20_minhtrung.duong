// node.js and firestore House Example
// Updated Nov. 25/2020, croftd

// from: https://firebase.google.com/docs/firestore/quickstart

var admin = require("firebase-admin");

// You will need to point to your own private .json file
var serviceAccount = require("./private/houses-ae993-firebase-adminsdk-5omzp-8a9489aa9f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://houses-ae993.firebaseio.com"
});

// get the database connection to Google Firestore
const db = admin.firestore();

// Express is a Node.js Model-View-Controller framework
const express = require('express'); 
const app = express();

// body-parser is to help get data from form inputs into the request object
// croftd: NOTE bodyParser does not support multi-part form data!!
// so if you have a form with enctype="multipart/form-data" this will not work
const bodyParser= require('body-parser');

// The urlencoded method within body-parser tells body-parser to extract 
// data from the <form> element and add them to the body property in
// the request object. This is required to receive the fetch put from main.js
app.use(bodyParser.json());

// this helps us read data from the form post 
app.use(bodyParser.urlencoded({ extended: true }));

// Multer is for multipart form uploads!
// Note: body-parser handles regular forms, multer handles multi-part
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });

// use embedded javascript (EJS) for view templates
app.set('view engine', 'ejs');

// this tells express to allow serving files from 'public' folders
app.use(express.static('public'));
// also tell express to serve photos uploaded
app.use(express.static('uploads'));

// croftd
// We are trying to build a RESTful API!
// This could be accessed from a browser or a mobile app
// CRUD
// Create
// Read
// Update
// Delete

// READ (The R in CRUD!)
// Base url with just '/' - show a list of all the houses
app.get('/', function(req, res) {
	console.log("Processing / route request...");
	
	db.collection('houses').get()
    .then(res2 => {
        let houseArray = [];
        res2.forEach(doc => {
          // create an object with Document data from Firestore
          var houseData = doc.data();
          // we need to add the id field (this is the unique auto generate identifier from Firestore)
          houseData.id = doc.id;
          houseArray.push(houseData);
          console.log(houseData);
        });

        // Note: render defaults to the views folder!
        res.render('index_v4.ejs', {houses: houseArray, house: null, action: "/house/add"});	
    })
    .catch(err => { console.error(err) });
});

// TEST
// for testing bodyy-parser for the test form post 
// see main.js for the test button
app.post('/test', function(req, res) {
  console.log("Here is the test route to test body-parser is working");
  console.log("Here is the request test: " + req.body.test);
  console.log("Here is the request.body: ");
  console.table(req.body);
  res.send("Test complete! Look at the console");
});

// CREATE - Show the add form
app.get('/house/add', function(req, res) {
  res.render('house/add.ejs', { house: null, action: "/house/add"});
});

// CREATE
// Route from post when submitting a form to add a new house
// croftd: note we added the second parameter 'upload' to use multer to 
// handle the multipart form rather than body-parser
app.post('/house/add', upload.array('photos', 12), async function(req, res) {
   console.log("Processing /house/add route request...");
   
    
   // note body-parser allows us to access the named inputs in the body
    // e.g.:
    console.log("Adding new house from req.body: ")
    console.table(req.body);
   
   // if you have multer configured correctly, you should be 
   // able to get the variables from the 'Add House' form e.g.:
   // NOTE: body-parser doesn't work with multipart forms! we need multer!
   let userAddress = req.body.address;
   let userPrice = req.body.price;
   let userSize = req.body.price;
   let userDescription =req.body.description;
   let userLat = parseFloat(req.body.lat);
   let userLong = parseFloat(req.body.long);
   let geoPoint = new admin.firestore.GeoPoint(userLat, userLong);

   // TODO: get the rest of the form inputs!

   // The code to handle photos for file upload input is complete below

  console.log("Here is req.files for photos:...");
	console.log(req.files);

	// Add the photos uploaded to req.body
  const userPhotos = Array();
  for(let i=0; i<req.files.length; i++) {
    userPhotos.push(req.files[i].filename);
  }

   // TODO: Firebase code to set the data for this new house!
   // Note the Firebase GeoPoint will be something like
   //  location: new admin.firestore.GeoPoint(userLat, userLong)
   // set the data for this Document

   let  newHouse = await db.collection('houses').add({
    address: userAddress,
    price: userPrice,
    size: userSize,
    description: userDescription,
    lat: userLat,
    long: userLong,
    photos: userPhotos,
    location: geoPoint
  });
  
  console.log('Added document with ID: ', res.id);

   console.log("New house added at address: " + userAddress);
   console.log("new price added: " + userPrice);
   console.log("new price added: " + userSize);
   console.log("new price added: " + userDescription);
   console.log("new price added: " + userLat);
   console.log("new price added: " + userLong);
   res.redirect('/');
});	






// EDIT - croftd: This code should be working!
app.get('/house/edit/:variable', function(req, res) {

  console.log("Processing /house/edit request...");

  let id = req.params.variable;
  console.log("Editing house: " + id);
  
  let houseRef = db.collection('houses').doc(id);
  let getDoc = houseRef.get()
  .then(doc => {
    if (!doc.exists) {
      console.log("Error editing house: " + id + " No such document!");
    } else {
      console.log('Editing house with current data:', doc.data());

      var houseData = doc.data();
      // we need to add the id field (this is the unique auto generate identifier from Firestore)
      houseData.id = doc.id;

      res.render('house/edit.ejs', {house: houseData, action: ("/house/update/" + id)});	
    }
  })
  .catch(err => {
    console.log('Error editing house', err);
  });
});

// UPDATE 
// is very similar to edit - we need to retrieve a single house by ID
// app.post('/house/update/:variable', function(req, res) {

//   console.log("Processing /house/update request...");

app.post('/house/update/:variable', upload.array('photos', 12), function(req, res) {
  console.log("req test" + req.body.address);
  console.log("req test" + req.body.price);
  console.log("req test" + req.body.size);
  console.log("" + req.body.description);
  console.log("" + req.body.lat);
  console.log("" + req.body.long);
  console.log("" + req.body.photos);
  console.log("" + req.body.location);
  console.log("Processing /house/update request...");

  let id = req.params.variable;
  console.log("Updating house: " + id);

  let houseRef = db.collection('houses').doc(id);
  let getDoc = houseRef.get()
  .then(doc => {
    if (!doc.exists) {
      console.log("Error updating house: " + id + " No such document!");
    } else {
      console.log('Updating house with current data:', doc.data());

      var houseData = doc.data();

      // We need to get the data from the form, same idea as adding a new house
      // Except we will use an existing Document reference

      // TODO
      // Need to write Google firestore database query to update this house!
      // let lat = parseFloat(req.body.lat);
      // let long = parseFloat(req.body.long);

      let userLat = parseFloat(req.body.lat);
      let userLong = parseFloat(req.body.long);

      console.log("Update lat and long are: " + userLat + ", " + userLong);

      let updateData = {
        address: String(req.body.address),
        price: Number(req.body.price),
        size: Number (req.body.size),
        description: String(req.body.description),
        location: new admin.firestore.GeoPoint(userLat, userLong),
        
      };
      houseRef.update(updateData);
    //  res.send("House at address: " + houseData.address + " updated");
      res.render('house/update.ejs', {address: houseData.address});	

      
    }
  })
  .catch(err => {
    console.log('Error editing house', err);
  });
});

// DELETE
app.get('/house/delete/:variable', function(req, res) {
 
  
    
    let houseId = req.params.variable;

    console.log("Processing /house/delete request for ID: " + houseId);
    const res2 = db.collection('houses').doc(houseId).delete()

    // TODO: Firebase function to delete the house with specified ID

    console.log("House " + houseId + " deleted!");

    // croft: we need to remember to change this after we do the 
    // actual delete on Firestore
    let wasDeleted = true;
    
    res.render('house/delete.ejs', {id: houseId, success: wasDeleted});

 });

// simple route for an about page...
app.get('/about', function(req, res) {
  res.render('about.ejs');
});

// After setting up the various routes, we start the application
// to listen for requests!
//
var port = 3000;
app.listen(port);
console.log("house app: server_v4.js listening on port " + port);




