# Use the official Node.js image as the base image
FROM node:latest

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of your application files to the working directory
COPY . .

# Expose the application port
EXPOSE 5173

# Start the application
CMD ["npm", "run", "dev"]
