package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.SnapshotDocument;
import com.networth.service.SnapshotService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Phase 4: REST endpoints for snapshot management.
 *
 * POST /api/snapshots         — take a manual snapshot now
 * GET  /api/snapshots         — list all snapshots (oldest first)
 * GET  /api/snapshots/latest  — get the most recent snapshot
 */
@RestController
@RequestMapping("/api/snapshots")
@RequiredArgsConstructor
public class SnapshotController {

    private final SnapshotService snapshotService;

    /** Take a snapshot of the current financial state. */
    @PostMapping
    public ResponseEntity<SnapshotDocument> takeSnapshot(HttpServletRequest req) {
        String userId = (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        SnapshotDocument snap = snapshotService.takeSnapshot(userId);
        return ResponseEntity.ok(snap);
    }

    /** Get all snapshots ordered oldest → newest (for the line chart). */
    @GetMapping
    public ResponseEntity<List<SnapshotDocument>> getSnapshots(HttpServletRequest req) {
        String userId = (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        return ResponseEntity.ok(snapshotService.getSnapshots(userId));
    }

    /** Get the most recent snapshot. Returns 204 if no snapshots exist yet. */
    @GetMapping("/latest")
    public ResponseEntity<SnapshotDocument> getLatest(HttpServletRequest req) {
        String userId = (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        return snapshotService.getLatest(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
