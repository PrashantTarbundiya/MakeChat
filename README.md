# 🤖 MakeChat - AI Chat Application

A full-stack AI chat application with multi-model support, user authentication, file uploads, web search, and conversation memory.

![React](https://img.shields.io/badge/React-19.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC)

## ✨ Features

- 🎯 **Multi-AI Model Support** - Google Gemini, OpenRouter, Groq, HuggingFace
- 🔐 **Authentication** - JWT & Google OAuth 2.0
- 💬 **Real-time Chat** - Streaming responses with markdown support
- 🎲 **3D Model Generation** - Interactive, code-generated Three.js models in real-time
- 🗺️ **Canvas Generation** - Interactive maps and Mermaid.js diagram generation
- 📁 **File Upload** - PDF & DOCX document processing
- 🔍 **Web Search** - Integrated search capabilities
- 🧠 **User Memory** - Personalized conversation context
- 🎨 **Modern UI** - Responsive design with Framer Motion animations
- 📝 **Syntax Highlighting** - Code block rendering
- ☁️ **Cloud Storage** - Cloudinary integration

## 🏗️ Project Structure

```
MakeChat/
├── Backend/
│   ├── config/          # Configuration files
│   │   ├── cloudinary.js
│   │   ├── db.js
│   │   └── systemPrompt.js
│   ├── middleware/      # Authentication middleware
│   ├── models/          # MongoDB schemas
│   │   ├── Chat.js
│   │   ├── User.js
│   │   └── UserMemory.js
│   ├── routes/          # API endpoints
│   │   ├── ai.js
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── memory.js
│   │   └── upload.js
│   ├── utils/           # Helper functions
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── Frontend/
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- API keys for AI models

### Backend Setup

1. Navigate to Backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# AI Model API Keys (choose at least one)
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Web Search API
SEARCH_API_KEY=your_search_api_key
```

4. Start the server:
```bash
npm run dev
```

Server runs on: **http://localhost:8000**

### Frontend Setup

1. Navigate to Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

4. Start the development server:
```bash
npm run dev
```

App runs on: **http://localhost:5173**

## 🔑 API Keys Setup

### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env` as `GEMINI_API_KEY`

### OpenRouter
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Generate API key
3. Add to `.env` as `OPENROUTER_API_KEY`

### Groq
1. Visit [Groq Console](https://console.groq.com/)
2. Create API key
3. Add to `.env` as `GROQ_API_KEY`

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Add credentials to `.env`

### Cloudinary
1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get credentials from dashboard
3. Add to `.env`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google` - Google OAuth login

### Chat
- `POST /api/ai/chat` - Send message to AI
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/:chatId` - Delete chat

### Memory
- `POST /api/memory` - Save user memory
- `GET /api/memory` - Get user memories
- `PUT /api/memory/:id` - Update memory
- `DELETE /api/memory/:id` - Delete memory

### Upload
- `POST /api/upload` - Upload file (PDF/DOCX)

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **React Markdown** - Markdown rendering
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Passport** - OAuth
- **Multer** - File uploads
- **Cloudinary** - Cloud storage
- **Axios** - HTTP client

### AI Models
- Google Gemini
- OpenRouter (GPT-4, Claude, etc.)
- Groq
- HuggingFace

## 📦 Key Dependencies

### Backend
```json
{
  "@google/generative-ai": "^0.24.1",
  "@openrouter/sdk": "^0.1.27",
  "groq-sdk": "^0.37.0",
  "express": "^4.18.2",
  "mongoose": "^9.0.0",
  "jsonwebtoken": "^9.0.2",
  "cloudinary": "^2.8.0",
  "multer": "^1.4.5-lts.1"
}
```

### Frontend
```json
{
  "react": "^19.2.0",
  "react-router-dom": "^7.9.6",
  "framer-motion": "^12.23.25",
  "react-markdown": "^10.1.0",
  "lucide-react": "^0.555.0"
}
```

## 🎨 Features in Detail

### Multi-Model AI Support
Switch between different AI models seamlessly. The application supports:
- Google Gemini Pro
- OpenRouter models (GPT-4, Claude, Llama, etc.)
- Groq models
- HuggingFace models

### File Processing
Upload and process documents:
- PDF files with text extraction
- DOCX files with content parsing
- Automatic cloud storage via Cloudinary

### Real-Time Asset Generation
The application features a secure, sandboxed Canvas and 3D Viewer capable of rendering:
- **3D Models**: Using a God-Tier specialized prompt and Three.js framework to generate highly detailed and anatomically structured 3D scenes.
- **Diagrams**: Native Mermaid.js integration for flowchart and architecture mapping.
- **Interactive Maps**: Geographic visualizations rendered seamlessly via Leaflet.

### User Memory System
Personalized AI experience:
- Store user preferences
- Remember conversation context
- Custom system prompts

### Web Search Integration
Enhanced responses with real-time web data using integrated search API.

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Environment variable configuration
- CORS enabled

## 🚢 Deployment

### Backend Deployment (Railway/Render/Heroku)
1. Set environment variables
2. Deploy from GitHub repository
3. Update MongoDB connection string

### Frontend Deployment (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy `dist` folder
3. Set environment variables
4. Update API URL

## 📝 Scripts

### Backend
```bash
npm start       # Start production server
npm run dev     # Start development server with hot reload
```

### Frontend
```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
npm run lint    # Run ESLint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB URI in `.env`
- Check network access in MongoDB Atlas
- Ensure IP whitelist is configured

### API Key Errors
- Verify all required API keys are set
- Check API key validity and quotas
- Ensure correct environment variable names

### CORS Errors
- Update CORS configuration in `server.js`
- Verify frontend URL matches allowed origins

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React, Node.js, and AI
