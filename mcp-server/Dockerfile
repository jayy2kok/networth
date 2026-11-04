FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --uid 10001 mcp
COPY --from=build /app/target/*.jar app.jar
USER mcp
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]