# Build stage - use Maven image directly to avoid wrapper JAR issues
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy the pom.xml file first for dependency caching
COPY pom.xml .

# Resolve dependencies (cached layer)
RUN mvn dependency:go-offline -B

# Copy the source code
COPY src src

# Package the application
RUN mvn package -DskipTests -B

# Run stage - lightweight JRE with memory-efficient flags for free tier (512MB RAM)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -XX:+UseSerialGC -Xss512k -XX:MaxRAMPercentage=75.0 -Dserver.port=${PORT} -jar app.jar"]
