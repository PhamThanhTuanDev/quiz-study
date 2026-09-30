package com.quizstudy.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.quizstudy.entity.Subject;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    Optional<Subject> findBySlug(String slug);
}
