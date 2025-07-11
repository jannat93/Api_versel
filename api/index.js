require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = "multer");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require('uuid'); // You will need this for publications

const app = express();

// --- CORS CONFIGURATION MUST GO FIRST ---
const allowedOrigins = [
  'https://portfolio-rs-2-mxdi1m7vx-jannats-projects-4f506c24.vercel.app',
  'http://localhost:5500', 
  'http://127.0.0.1:5500'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// Apply the configured CORS options before any routes
app.use(cors(corsOptions));


// --- OTHER MIDDLEWARE ---
app.use(express.json());


// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


// --- STORAGE FOR FILE UPLOADS ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// In-memory storage for publications. This will reset on deploy.
let publications = [];


// --- API ROUTES ---

// 1. GET / -> List all image/pdf files from Cloudinary
app.get("/", async (req, res) => {
  try {
    const { resources } = await cloudinary.search
      .expression('folder:portfolio_uploads')
      .sort_by('public_id', 'desc')
      .max_results(50)
      .execute();
    
    const files = resources.map(file => {
        const parts = file.secure_url.split('/');
        return parts[parts.length - 1];
    });

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch files from Cloudinary" });
  }
});


// 2. POST /upload -> Handles all file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "portfolio_uploads",
        public_id: req.file.originalname.split('.')[0] 
      },
      (error, result) => {
        if (error) {
          return res.status(500).json({ error: "Upload to Cloudinary failed." });
        }
        res.json({ url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: "Upload Failed" });
  }
});


// 3. GET /publications -> Get list of text publications
app.get('/publications', (req, res) => {
  res.json(publications);
});


// 4. POST /publications -> Add a new text publication
app.post('/publications', (req, res) => {
    const { title, url } = req.body;
    if (!title || !url) {
        return res.status(400).json({ error: 'Title and URL are required.' });
    }
    const newPub = { id: uuidv4(), title, url };
    publications.push(newPub);
    res.status(201).json(newPub);
});


// 5. DELETE /publications/:id -> Delete a text publication
app.delete('/publications/:id', (req, res) => {
    const { id } = req.params;
    publications = publications.filter(pub => pub.id !== id);
    res.status(204).send();
});


// --- EXPORT THE APP FOR VERCEL ---
// DO NOT use app.listen()
module.exports = app;