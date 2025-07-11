// A CLEAN AND CORRECT API FILE

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid"); // Make sure to run: npm install uuid

const app = express();

// --- Middleware ---

// This handles CORS. We allow any website to connect, which is simpler for now.
app.use(cors()); 

app.use(express.json());


// --- Cloudinary Configuration ---
// This part reads your secret keys from Vercel's environment variables.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


// --- Code for Handling File Uploads ---
const storage = multer.memoryStorage();
const upload = multer({ storage });
let publications = []; // A temporary place to store text publications


// --- API ROUTES (The actions our API can do) ---

// This action GETS all files from Cloudinary and sends them to the website.
app.get("/", async (req, res) => {
  try {
    const [imageFiles, publicationData] = await Promise.all([
        cloudinary.search.expression('folder:portfolio_uploads').sort_by('public_id', 'desc').max_results(50).execute(),
        // For this simple version, publications are just in memory
        Promise.resolve(publications) 
    ]);
    
    // Combine the file URLs and the publication data
    const files = imageFiles.resources.map(file => {
        const parts = file.secure_url.split('/');
        return parts[parts.length - 1];
    });

    res.json({
        files: files,
        publications: publicationData
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data." });
  }
});


// This action UPLOADS a new file.
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const uploadStream = cloudinary.uploader.upload_stream({ folder: "portfolio_uploads" }, (error, result) => {
    if (error) {
      return res.status(500).json({ error: "Upload failed." });
    }
    res.json({ url: result.secure_url });
  });

  uploadStream.end(req.file.buffer);
});


// This action ADDS a new text publication.
app.post('/publications', (req, res) => {
    const { title, url } = req.body;
    const newPub = { id: uuidv4(), title, url };
    publications.push(newPub);
    res.status(201).json(newPub);
});

// This action DELETES a text publication.
app.delete('/publications/:id', (req, res) => {
    publications = publications.filter(pub => pub.id !== req.params.id);
    res.status(204).send();
});


// --- This is required for Vercel to work ---
module.exports = app;