# Voyage DZ - Production Docker Image
# Uses nginx to serve static files

FROM nginx:alpine

# Copy all application files to nginx html directory
COPY . /usr/share/nginx/html

# Copy custom nginx configuration (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
