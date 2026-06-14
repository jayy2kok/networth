package com.networth.repository;

import com.networth.model.document.SnapshotDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Phase 4: Snapshot repository for historical net worth tracking.
 */
public interface SnapshotRepository extends MongoRepository<SnapshotDocument, String> {

    /** All snapshots for a user, oldest first — used for the line chart. */
    List<SnapshotDocument> findByUserIdOrderBySnapshotDateAsc(String userId);

    /** Most recent snapshot — used by GET /api/snapshots/latest. */
    Optional<SnapshotDocument> findTopByUserIdOrderBySnapshotDateDesc(String userId);

    /** Existence check to avoid duplicate snapshots on the same date. */
    Optional<SnapshotDocument> findByUserIdAndSnapshotDate(String userId, LocalDate date);
}
