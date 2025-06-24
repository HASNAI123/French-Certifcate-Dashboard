#!/bin/bash

echo "🚀 Starting French Energy Auctions Dashboard..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "backend/index.js" ]; then
    echo "❌ Error: Please run this script from the project root directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd backend && npm install && cd ..
fi

# Start the server
echo "🌐 Starting server on http://localhost:3001"
echo "📊 Dashboard will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd backend && node index.js 