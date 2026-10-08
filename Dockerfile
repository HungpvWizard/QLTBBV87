# ==============================================================================
# HỆ THỐNG QUẢN LÝ TRANG BỊ & THIẾT BỊ Y TẾ (ASSETFLOW) - BV QUÂN Y 87
# DOCKERFILE ĐA TẦNG (MULTI-STAGE BUILD): NODE.JS + .NET 8 ASP.NET RUNTIME
# ==============================================================================

# STAGE 1: Biên dịch Frontend React + Vite
FROM node:20-alpine AS build-frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# STAGE 2: Biên dịch Backend C# .NET 8 WebAPI
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-backend
WORKDIR /src
COPY backend/AssetManagement.Domain/AssetManagement.Domain.csproj AssetManagement.Domain/
COPY backend/AssetManagement.Application/AssetManagement.Application.csproj AssetManagement.Application/
COPY backend/AssetManagement.Infrastructure/AssetManagement.Infrastructure.csproj AssetManagement.Infrastructure/
COPY backend/AssetManagement.WebAPI/AssetManagement.WebAPI.csproj AssetManagement.WebAPI/
RUN dotnet restore AssetManagement.WebAPI/AssetManagement.WebAPI.csproj

COPY backend/AssetManagement.Domain/ AssetManagement.Domain/
COPY backend/AssetManagement.Application/ AssetManagement.Application/
COPY backend/AssetManagement.Infrastructure/ AssetManagement.Infrastructure/
COPY backend/AssetManagement.WebAPI/ AssetManagement.WebAPI/

# Sao chép kết quả build Frontend vào thư mục wwwroot của WebAPI
COPY --from=build-frontend /src/backend/AssetManagement.WebAPI/wwwroot/ AssetManagement.WebAPI/wwwroot/

RUN dotnet publish AssetManagement.WebAPI/AssetManagement.WebAPI.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# STAGE 3: Runtime tinh gọn (ASP.NET Core 8.0)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

# Tạo thư mục lưu trữ dữ liệu và backup
RUN mkdir -p /app/data /app/backups

COPY --from=build-backend /app/publish .

VOLUME ["/app/data", "/app/backups"]

ENTRYPOINT ["dotnet", "AssetManagement.WebAPI.dll"]
