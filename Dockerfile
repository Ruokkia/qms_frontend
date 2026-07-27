# ===== 阶段1: Node 构建 =====
FROM node:18-alpine AS builder
WORKDIR /build
COPY package.json ./
RUN npm install --registry=https://registry.npmmirror.com
COPY . .
RUN npm run build

# ===== 阶段2: Nginx 托管 =====
FROM nginx:alpine
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
