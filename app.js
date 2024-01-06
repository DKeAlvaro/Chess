const { spawn } = require('child_process');
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the destination folder for file uploads
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// Serve HTML form on the root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle file uploads and execute Python script
app.post('/upload', upload.single('pgnFile'), (req, res) => {
  const uploadedFile = req.file;

  // Execute Python script with the uploaded file as an argument
  const pythonProcess = spawn('python', ['process_pgn.py', path.join(__dirname, 'uploads', uploadedFile.filename)]);

  let outputData = '';
  let errorData = '';

  pythonProcess.stdout.on('data', (data) => {
    outputData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      // Python script executed successfully
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chess Elo predictor</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }

            div {
              background-color: #4caf50;
              color: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              text-align: center;
            }

            a {
              color: #fff;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div>
            <h2>File Uploaded and Processed Successfully!</h2>
            <p>Estimated Elo:</p>
            <pre>${outputData}</pre>
            <p><a href="/">Back to Upload Page</a></p>
          </div>
        </body>
        </html>
      `);
    } else {
      // Python script execution failed
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }

            div {
              background-color: #f44336;
              color: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              text-align: center;
            }

            a {
              color: #fff;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div>
            <h2>Error Processing File</h2>
            <p>Python Script Output:</p>
            <pre>${errorData}</pre>
            <p><a href="/">Back to Upload Page</a></p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
