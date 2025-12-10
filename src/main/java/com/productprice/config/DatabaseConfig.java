package com.productprice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;

@Configuration
@Slf4j
public class DatabaseConfig {

    @Bean
    public CommandLineRunner checkDatabaseConnection(DataSource dataSource) {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                log.info("✅ Database connection successful!");
                log.info("Database URL: {}", connection.getMetaData().getURL());
                log.info("Database User: {}", connection.getMetaData().getUserName());
            } catch (Exception e) {
                log.error("❌ Database connection failed: {}", e.getMessage());
                log.error("Please check your database configuration in application.properties");
            }
        };
    }
}

