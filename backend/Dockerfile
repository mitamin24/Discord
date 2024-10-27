# Use the official Node.js image as a base
FROM node:20

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port your app runs on
EXPOSE 3001

# Run the application using the start script in package.json
CMD ["npm", "start"]
