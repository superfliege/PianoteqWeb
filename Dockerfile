FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx template (envsubst will fill in PIANOTEQ_HOST / PIANOTEQ_PORT)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy static web app
COPY index.html style.css app.js /usr/share/nginx/html/

# Default values – override via docker-compose or docker run -e
ENV PIANOTEQ_HOST=host.docker.internal
ENV PIANOTEQ_PORT=8081

EXPOSE 80
