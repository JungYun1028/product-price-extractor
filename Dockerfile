# Multi-stage build for Spring Boot
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cache layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage (ARM64 호환)
FROM eclipse-temurin:17-jre
WORKDIR /app

# Create uploads directory
RUN mkdir -p /app/uploads

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8000

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]

