# ── Build stage ──────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache Maven dependencies before copying source
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy OpenAPI spec — required by openapi-generator-maven-plugin at compile time
COPY api/ api/

# Copy source and build fat-JAR
COPY src/ src/
RUN mvn clean package -DskipTests

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 6060
ENTRYPOINT ["java", "-jar", "app.jar"]
