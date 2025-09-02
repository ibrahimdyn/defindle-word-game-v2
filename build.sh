#!/bin/bash
set -e

echo "Building application..."
npm run build

echo "Copying assets to server directory..."
mkdir -p server/public
cp -r dist/public/* server/public/

echo "Build completed successfully!"
