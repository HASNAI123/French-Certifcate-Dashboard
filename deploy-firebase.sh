#!/bin/bash

echo "🚀 Deploying to Firebase Hosting..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase..."
    firebase login
fi

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found. Please run 'firebase init hosting' first."
    exit 1
fi

# Build and deploy
echo "📦 Building and deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment completed!"
echo "🌐 Your app should be available at: https://your-project-id.web.app"
echo ""
echo "📝 Don't forget to:"
echo "   1. Update the API URL in frontend/index.html"
echo "   2. Deploy your backend to a hosting service"
echo "   3. Update CORS settings in your backend" 