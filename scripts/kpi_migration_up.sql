-- KPI MODULE DATABASE MIGRATION SCRIPT (UP)
-- Idempotent script for SQLite (BV Quan y 87 - Asset & Equipment Management)
-- Date: 01/10/2026

CREATE TABLE IF NOT EXISTS KpiDefinitions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Version INTEGER NOT NULL DEFAULT 1,
    Code TEXT NOT NULL,
    Name TEXT NOT NULL,
    "Group" TEXT NOT NULL,
    Weight REAL NOT NULL,
    Unit TEXT NOT NULL,
    EvaluationDirection TEXT NOT NULL,
    ThresholdExcellent REAL NULL,
    ThresholdGood REAL NULL,
    ThresholdAverage REAL NULL,
    OrderIndex INTEGER NOT NULL,
    CriteriaNote TEXT NULL,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_KpiDefinitions_Version_Code ON KpiDefinitions(Version, Code);
CREATE INDEX IF NOT EXISTS IX_KpiDefinitions_Group ON KpiDefinitions("Group");

CREATE TABLE IF NOT EXISTS KpiAssessments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    DepartmentId INTEGER NULL,
    DepartmentName TEXT NOT NULL,
    PeriodType TEXT NOT NULL,
    PeriodYear INTEGER NOT NULL,
    PeriodQuarter INTEGER NULL,
    PeriodMonth INTEGER NULL,
    PeriodName TEXT NOT NULL,
    StartDate TEXT NULL,
    EndDate TEXT NULL,
    ConfigVersion INTEGER NOT NULL DEFAULT 1,
    Status TEXT NOT NULL DEFAULT 'Draft',
    Revision INTEGER NOT NULL DEFAULT 1,
    CreatedByUserId INTEGER NULL,
    CreatedByUserName TEXT NULL,
    ApprovedByUserId INTEGER NULL,
    ApprovedByUserName TEXT NULL,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL,
    ScoreGroupA REAL NOT NULL DEFAULT 0,
    ScoreGroupB REAL NOT NULL DEFAULT 0,
    ScoreGroupC REAL NOT NULL DEFAULT 0,
    ScoreGroupD REAL NOT NULL DEFAULT 0,
    TotalScore REAL NOT NULL DEFAULT 0,
    ScoreRating TEXT NOT NULL DEFAULT 'Không đạt',
    HasFailKpi INTEGER NOT NULL DEFAULT 0,
    HasSevereIncidents INTEGER NOT NULL DEFAULT 0,
    HasOverdueDevicesUsed INTEGER NOT NULL DEFAULT 0,
    HasLegalViolations INTEGER NOT NULL DEFAULT 0,
    BlockingNote TEXT NULL,
    FinalRating TEXT NULL,
    FinalConclusionNotes TEXT NULL,
    DecidedBy TEXT NULL,
    DecisionDate TEXT NULL,
    DecisionReference TEXT NULL,
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS IX_KpiAssessments_DepartmentId ON KpiAssessments(DepartmentId);
CREATE INDEX IF NOT EXISTS IX_KpiAssessments_PeriodYear_PeriodMonth ON KpiAssessments(PeriodYear, PeriodMonth);
CREATE INDEX IF NOT EXISTS IX_KpiAssessments_Status ON KpiAssessments(Status);

CREATE TABLE IF NOT EXISTS KpiAssessmentLines (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    AssessmentId INTEGER NOT NULL,
    KpiCode TEXT NOT NULL,
    KpiName TEXT NOT NULL,
    "Group" TEXT NOT NULL,
    Weight REAL NOT NULL,
    Unit TEXT NOT NULL,
    EvaluationDirection TEXT NOT NULL,
    ThresholdExcellent REAL NULL,
    ThresholdGood REAL NULL,
    ThresholdAverage REAL NULL,
    Numerator REAL NULL,
    Denominator REAL NULL,
    ActualValue REAL NULL,
    CalculatedResult REAL NULL,
    RatingLevel TEXT NULL,
    Score REAL NULL,
    ConvertedScore REAL NULL,
    Notes TEXT NULL,
    ExceptionNotes TEXT NULL,
    UpdatedBy TEXT NULL,
    UpdatedAt TEXT NULL,
    FOREIGN KEY (AssessmentId) REFERENCES KpiAssessments(Id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_KpiAssessmentLines_AssessmentId_KpiCode ON KpiAssessmentLines(AssessmentId, KpiCode);
CREATE INDEX IF NOT EXISTS IX_KpiAssessmentLines_AssessmentId ON KpiAssessmentLines(AssessmentId);

CREATE TABLE IF NOT EXISTS KpiAudits (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    AssessmentId INTEGER NOT NULL,
    Action TEXT NOT NULL,
    PerformedBy TEXT NOT NULL,
    IpAddress TEXT NULL,
    Details TEXT NULL,
    CreatedAt TEXT NOT NULL,
    FOREIGN KEY (AssessmentId) REFERENCES KpiAssessments(Id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS IX_KpiAudits_AssessmentId ON KpiAudits(AssessmentId);
