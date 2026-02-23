FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 lightnovel-crawler
RUN pip install --no-cache-dir lightnovel-crawler

# 创建数据目录
RUN mkdir -p /data

# 暴露端口
EXPOSE 8080

# 启动服务
CMD ["lncrawl", "-ll", "server", "-p", "8080"]
