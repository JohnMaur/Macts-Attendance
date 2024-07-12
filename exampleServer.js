// const express = require('express');
// const bodyParser = require('body-parser');
// const http = require('http');
// const { Server } = require("socket.io");
// const Koa = require("koa");
// const Router = require("koa-router");

// const app = express();
// const port = process.env.PORT || 2727;

// // Create an HTTP server
// const server = http.createServer(app);

// // Pass the server instance to Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   }
// });

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// io.on('connection', (socket) => {
//   console.log('New WebSocket connection');
  
//   socket.on('tagData', (data) => {
//     console.log('Received tag data via WebSocket:', data);
//   });

//   socket.on('disconnect', () => {
//     console.log('WebSocket disconnected');
//   });
// });

// // Array to store RFID tag data
// const tagDataArray = [];

// // Route to handle POST requests to /tagData
// app.post('/tagData', (req, res) => {
//   const tagData = req.body.tagData;

//   console.log('Received tag data via POST:', tagData);
//   tagDataArray.push(tagData);

//   io.emit('tagData', tagData);

//   res.send('Tag data received successfully');
// });

// // Koa setup
// const koaApp = new Koa();
// const router = new Router();

// router.get('/', async (ctx) => {
//   ctx.body = "Hello World from Railway";
// });

// koaApp.use(router.routes()).use(router.allowedMethods());

// // Middleware to handle Koa routes in Express
// app.use('/koa', (req, res) => {
//   koaApp.callback()(req, res);
// });

// // Start the HTTP server
// server.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const Koa = require("koa");
const Router = require("koa-router");

const app = express();
const port = process.env.PORT || 2727;

// Create an HTTP server
const server = http.createServer(app);

// Pass the server instance to Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

io.on('connection', (socket) => {
  console.log('New WebSocket connection');
  
  socket.on('tagData', (data) => {
    console.log('Received tag data via WebSocket:', data);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });
});

// Object to store RFID tag data with timestamp
const tagDataMap = {};

// Route to handle POST requests to /tagData
app.post('/tagData', async (req, res) => {
  const tagData = req.body.tagData;

  console.log('Received tag data via POST:', tagData);

  const now = new Date().getTime();
  const timeout = 60000; // 1 minute in milliseconds

  if (tagDataMap[tagData] && now - tagDataMap[tagData] < timeout) {
    console.log("You've already tapped your RFID card. Please wait for a minute before tapping again.");
    return res.status(429).send("You've already tapped your RFID card. Please wait for a minute before tapping again.");
  }

  tagDataMap[tagData] = now;

  // Fetch student information from the MySQL server
  try {
    const response = await axios.get('https://macts-backend-webapp-production-0bd2.up.railway.app/studentInfo');
    const students = response.data;
    const formattedDate = new Date().toLocaleString(); // Format the date

    // Check for matching tagValue and attendance_code
    const matchedStudent = students.find(student => student.tagValue === tagData && student.attendance_code);

    if (matchedStudent) {
      console.log('RFID tag matched:', matchedStudent);

      // Insert matched student information into attendance_taphistory
      const attendanceHistory = {
        attendance_firstName: matchedStudent.studentInfo_first_name,
        attendance_middleName: matchedStudent.studentInfo_middle_name,
        attendance_Lastname: matchedStudent.studentInfo_last_name,
        attendance_tupId: matchedStudent.studentInfo_tuptId,
        attendance_course: matchedStudent.studentInfo_course,
        attendance_section: matchedStudent.studentInfo_section,
        attendance_email: matchedStudent.user_email,
        attendance_historyDate: formattedDate,
        attendance_code: matchedStudent.attendance_code,
        user_id: matchedStudent.user_id
      };

      await axios.post('https://macts-backend-webapp-production-0bd2.up.railway.app/attendance_taphistory', attendanceHistory);
      console.log('Tap history recorded successfully');
    } else {
      console.log('No matching RFID tag found or attendance code is empty');
    }

    io.emit('tagData', tagData);
  } catch (error) {
    console.error('Error fetching student information or recording tap history:', error);
  }

  res.send('Tag data received successfully');
});

// Koa setup
const koaApp = new Koa();
const router = new Router();

router.get('/', async (ctx) => {
  ctx.body = "Hello World from Railway";
});

koaApp.use(router.routes()).use(router.allowedMethods());

// Middleware to handle Koa routes in Express
app.use('/koa', (req, res) => {
  koaApp.callback()(req, res);
});

// Start the HTTP server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
