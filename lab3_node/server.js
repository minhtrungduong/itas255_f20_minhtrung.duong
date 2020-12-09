'use strict';

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
   res.send('Hello world basic node server example from ITAS TOBA\n');
});

app.get('/houses/list', (req, res) => {
   res.send('Here is a list of houses');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
