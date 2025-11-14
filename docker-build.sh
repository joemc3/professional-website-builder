#!/bin/bash
set -e

# Professional Website Builder - Docker Build Script
# This script builds all Docker images with proper tags

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_PREFIX="professional-website-builder"
VERSION="${1:-latest}"  # Default to 'latest' if no version provided

echo -e "${GREEN}Building Professional Website Builder Docker Images${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo ""

# Function to build an image
build_image() {
    local service=$1
    local context=$2
    local dockerfile=$3
    local image_name="${IMAGE_PREFIX}-${service}:${VERSION}"

    echo -e "${YELLOW}Building ${service}...${NC}"

    if docker build -t "${image_name}" -f "${dockerfile}" "${context}"; then
        echo -e "${GREEN}✓ Successfully built ${image_name}${NC}"

        # Also tag as 'latest' if building a specific version
        if [ "${VERSION}" != "latest" ]; then
            docker tag "${image_name}" "${IMAGE_PREFIX}-${service}:latest"
            echo -e "${GREEN}✓ Tagged as ${IMAGE_PREFIX}-${service}:latest${NC}"
        fi

        return 0
    else
        echo -e "${RED}✗ Failed to build ${image_name}${NC}"
        return 1
    fi
}

# Build API (Rust backend)
echo "═════════════════════════════════════════════════════"
build_image "api" "./src-api" "./src-api/Dockerfile" || exit 1
echo ""

# Build Frontend (React + Nginx)
echo "═════════════════════════════════════════════════════"
build_image "frontend" "./src-ui" "./src-ui/Dockerfile" || exit 1
echo ""

# Build Generator (Next.js)
echo "═════════════════════════════════════════════════════"
build_image "generator" "./src-generator" "./src-generator/Dockerfile" || exit 1
echo ""

# Summary
echo "═════════════════════════════════════════════════════"
echo -e "${GREEN}All images built successfully!${NC}"
echo ""
echo "Built images:"
docker images | grep "${IMAGE_PREFIX}" | grep "${VERSION}"
echo ""

# Display size information
echo "Total image sizes:"
docker images | grep "${IMAGE_PREFIX}" | grep "${VERSION}" | awk '{sum += $7} END {print sum " MB"}'
echo ""

# Optional: Save images to tar files
read -p "Do you want to save images to tar files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Saving images to tar files...${NC}"
    mkdir -p ./docker-images

    docker save "${IMAGE_PREFIX}-api:${VERSION}" | gzip > "./docker-images/api-${VERSION}.tar.gz"
    echo -e "${GREEN}✓ Saved api image${NC}"

    docker save "${IMAGE_PREFIX}-frontend:${VERSION}" | gzip > "./docker-images/frontend-${VERSION}.tar.gz"
    echo -e "${GREEN}✓ Saved frontend image${NC}"

    docker save "${IMAGE_PREFIX}-generator:${VERSION}" | gzip > "./docker-images/generator-${VERSION}.tar.gz"
    echo -e "${GREEN}✓ Saved generator image${NC}"

    echo -e "${GREEN}Images saved to ./docker-images/${NC}"
fi

# Optional: Push to registry
read -p "Do you want to push images to a registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter registry URL (e.g., docker.io/username): " registry

    for service in api frontend generator; do
        local_image="${IMAGE_PREFIX}-${service}:${VERSION}"
        remote_image="${registry}/${IMAGE_PREFIX}-${service}:${VERSION}"

        echo -e "${YELLOW}Tagging ${local_image} as ${remote_image}${NC}"
        docker tag "${local_image}" "${remote_image}"

        echo -e "${YELLOW}Pushing ${remote_image}${NC}"
        docker push "${remote_image}"
        echo -e "${GREEN}✓ Pushed ${remote_image}${NC}"
    done

    echo -e "${GREEN}All images pushed to registry!${NC}"
fi

echo ""
echo -e "${GREEN}Build process complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and configure your environment variables"
echo "  2. Run './docker-run.sh' to start the application"
echo "  3. Access the application at http://localhost"
