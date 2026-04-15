# pickuppicker-ui/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy the package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the React code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start Vite. The --host flag is REQUIRED inside Docker
# so it can be accessed from your local browser!
CMD ["npm", "run", "dev", "--", "--host"]