# Node House App

Initial setup:

https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

NOTE: We won't require Docker to run most of this lab, however it will be useful if/when we push it to the cloud.

To complete lab 3, work with the server_v4.js node application. This makes use of 
index_v4.ejs for the main view listing the houses. 

You will need to install firebase-admin and other node module:

```
npm install express --save
npm install body-parser --save
npm install firebase-admin --save
npm install ejs --save

```
// croftd: NOTE bodyParser does not support multi-part form data!!
// so if you have a form with enctype="multipart/form-data" this will not work

For multi-part form data, we can't use body-parser - we will use a module called multer:

npm install multer --save

See the multer README at: https://www.npmjs.com/package/multer#readme

// See the directions for Lab 3 on portal.itas.ca!
https://portal.itas.ca/mod/assign/view.php?id=34691

// You will need to add code for the house add/edit/delete routes to work with Google Firestore

