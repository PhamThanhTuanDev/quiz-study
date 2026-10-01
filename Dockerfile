FROM node:24-bookworm AS frontend-build

WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-25 AS backend-build

WORKDIR /workspace
COPY backend/pom.xml backend/pom.xml
RUN mvn -f backend/pom.xml dependency:go-offline
COPY backend/ backend/
COPY --from=frontend-build /workspace/frontend/dist backend/src/main/resources/static/
RUN mvn -f backend/pom.xml -DskipTests package

FROM eclipse-temurin:25-jre

WORKDIR /app
COPY --from=backend-build /workspace/backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]