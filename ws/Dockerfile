# Use the official Node.js image as a base
FROM node:20

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the application code
COPY . .


# Compile TypeScript code
RUN npm run build

# Expose the port the WebSocket server runs on
EXPOSE 8080

# Start the WebSocket server
CMD ["npm", "start"]
