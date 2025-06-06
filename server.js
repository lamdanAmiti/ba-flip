const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.ttf' || ext === '.woff2' || ext === '.woff' || ext === '.otf') {
      cb(null, true);
    } else {
      cb(new Error('Only font files are allowed!'), false);
    }
  }
});

// Create necessary directories
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('output')) {
  fs.mkdirSync('output');
}

// Hebrew Atbash mapping
const hebrewAtbashMap = {
  // Original -> Atbash swapped back to original
  0x05D0: 0x05EA, // א -> ת
  0x05D1: 0x05E9, // ב -> ש
  0x05D2: 0x05E8, // ג -> ר
  0x05D3: 0x05E7, // ד -> ק
  0x05D4: 0x05E6, // ה -> צ
  0x05D5: 0x05E4, // ו -> פ
  0x05D6: 0x05E2, // ז -> ע
  0x05D7: 0x05E1, // ח -> ס
  0x05D8: 0x05E0, // ט -> נ
  0x05D9: 0x05DE, // י -> מ
  0x05DB: 0x05DC, // כ -> ל
  0x05DC: 0x05DB, // ל -> כ
  0x05DE: 0x05D9, // מ -> י
  0x05E0: 0x05D8, // נ -> ט
  0x05E1: 0x05D7, // ס -> ח
  0x05E2: 0x05D6, // ע -> ז
  0x05E4: 0x05D5, // פ -> ו
  0x05E6: 0x05D4, // צ -> ה
  0x05E7: 0x05D3, // ק -> ד
  0x05E8: 0x05D2, // ר -> ג
  0x05E9: 0x05D1, // ש -> ב
  0x05EA: 0x05D0  // ת -> א
};

// Serve static files
app.use(express.static('public'));
app.use('/output', express.static('output'));

// Main page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hebrew Atbash Font Flipper</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        .description {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
        }
        .upload-area {
            border: 2px dashed #ccc;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            margin: 20px 0;
            transition: border-color 0.3s;
        }
        .upload-area:hover {
            border-color: #4CAF50;
        }
        .upload-area.dragover {
            border-color: #4CAF50;
            background-color: #f0f8f0;
        }
        input[type="file"] {
            margin: 10px 0;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
        }
        button:hover {
            background-color: #45a049;
        }
        button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        .progress {
            display: none;
            margin: 20px 0;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background-color: #4CAF50;
            width: 0%;
            transition: width 0.3s;
        }
        .result {
            margin: 20px 0;
            padding: 15px;
            border-radius: 5px;
            display: none;
        }
        .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .atbash-example {
            font-family: monospace;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Hebrew Atbash Font Flipper</h1>
        
        <div class="description">
            <h3>What does this tool do?</h3>
            <p>This tool fixes Hebrew fonts that have been encoded with Atbash cipher. If your font displays Tav (ת) when you type Aleph (א), this tool will remap the glyphs so they display correctly.</p>
            
            <div class="atbash-example">
                <strong>Atbash Mapping:</strong><br>
                א ↔ ת, ב ↔ ש, ג ↔ ר, ד ↔ ק, ה ↔ צ, ו ↔ פ, ז ↔ ע, ח ↔ ס, ט ↔ נ, י ↔ מ, כ ↔ ל
            </div>
        </div>

        <form id="uploadForm" enctype="multipart/form-data">
            <div class="upload-area" id="uploadArea">
                <h3>📁 Upload Your Font File</h3>
                <p>Drag and drop your font file here, or click to browse</p>
                <input type="file" name="fontFile" id="fontFile" accept=".ttf,.woff,.woff2,.otf" required>
                <br>
                <small>Supported formats: TTF, WOFF, WOFF2, OTF</small>
            </div>
            
            <div style="text-align: center;">
                <button type="submit" id="submitBtn">🔧 Fix Atbash Font</button>
            </div>
        </form>

        <div class="progress" id="progress">
            <p>Processing font...</p>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </div>

        <div class="result" id="result"></div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fontFile');
        const form = document.getElementById('uploadForm');
        const submitBtn = document.getElementById('submitBtn');
        const progress = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');
        const result = document.getElementById('result');

        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
            }
        });

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const file = fileInput.files[0];
            
            if (!file) {
                showResult('Please select a font file.', 'error');
                return;
            }

            formData.append('fontFile', file);
            
            submitBtn.disabled = true;
            progress.style.display = 'block';
            result.style.display = 'none';
            
            // Simulate progress
            let progressValue = 0;
            const progressInterval = setInterval(() => {
                progressValue += 10;
                progressFill.style.width = progressValue + '%';
                if (progressValue >= 90) {
                    clearInterval(progressInterval);
                }
            }, 200);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                clearInterval(progressInterval);
                progressFill.style.width = '100%';
                
                setTimeout(() => {
                    progress.style.display = 'none';
                    submitBtn.disabled = false;
                    
                    if (data.success) {
                        showResult(\`
                            <strong>✅ Success!</strong><br>
                            Your font has been fixed and is ready for download.<br>
                            <a href="/output/\${data.filename}" download style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">📥 Download Fixed Font</a>
                        \`, 'success');
                    } else {
                        showResult('❌ Error: ' + data.error, 'error');
                    }
                }, 500);
                
            } catch (error) {
                clearInterval(progressInterval);
                progress.style.display = 'none';
                submitBtn.disabled = false;
                showResult('❌ Network error: ' + error.message, 'error');
            }
        });

        function showResult(message, type) {
            result.innerHTML = message;
            result.className = 'result ' + type;
            result.style.display = 'block';
        }
    </script>
</body>
</html>
  `);
});

// Upload and process font
app.post('/upload', upload.single('fontFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const outputFilename = 'fixed-' + req.file.originalname;
    const outputPath = path.join('output', outputFilename);

    // Read the font file
    const fontBuffer = fs.readFileSync(inputPath);
    
    // Parse the font
    const font = opentype.parse(fontBuffer);
    
    // Create a new font with swapped glyphs
    const newGlyphs = {};
    
    // Copy all existing glyphs first
    Object.keys(font.glyphs.glyphs).forEach(key => {
      newGlyphs[key] = font.glyphs.glyphs[key];
    });
    
    // Now swap the Hebrew characters according to Atbash mapping
    Object.keys(hebrewAtbashMap).forEach(fromUnicode => {
      const toUnicode = hebrewAtbashMap[fromUnicode];
      const fromChar = parseInt(fromUnicode);
      const toChar = parseInt(toUnicode);
      
      // Find glyphs for these characters
      const fromGlyph = font.charToGlyph(String.fromCharCode(fromChar));
      const toGlyph = font.charToGlyph(String.fromCharCode(toChar));
      
      if (fromGlyph && toGlyph && fromGlyph.index !== 0 && toGlyph.index !== 0) {
        // Swap the glyphs - put the "to" glyph in the "from" position
        newGlyphs[fromGlyph.index] = {
          ...toGlyph,
          unicode: fromChar,
          unicodes: [fromChar]
        };
        
        // And put the "from" glyph in the "to" position  
        newGlyphs[toGlyph.index] = {
          ...fromGlyph,
          unicode: toChar,
          unicodes: [toChar]
        };
      }
    });

    // Create new font with corrected glyphs
    const newFont = new opentype.Font({
      familyName: font.names.fontFamily.en + ' (Atbash Fixed)',
      styleName: font.names.fontSubfamily.en,
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      glyphs: Object.values(newGlyphs)
    });

    // Write the corrected font
    const arrayBuffer = newFont.toArrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

    // Clean up uploaded file
    fs.unlinkSync(inputPath);

    res.json({ 
      success: true, 
      filename: outputFilename,
      message: 'Font successfully processed and Atbash encoding corrected!'
    });

  } catch (error) {
    console.error('Error processing font:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process font: ' + error.message 
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Hebrew Atbash Font Flipper running at http://localhost:${port}`);
  console.log(`📁 Upload folder: ${path.resolve('uploads')}`);
  console.log(`📁 Output folder: ${path.resolve('output')}`);
});

module.exports = app;
