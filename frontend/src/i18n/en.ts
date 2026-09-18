export interface Messages {
  admin: {
    sandboxEngines: string;
    sandboxEnginesHint: string;
    engineStatusRunning: string;
    engineStatusStopped: string;
    engineStart: string;
    engineStop: string;
    engineStarting: string;
    engineStopping: string;
    engineStartedAt: string;
    tabEngines: string;
    tabUsers: string;
    tabSettings: string;
    usersTitle: string;
    usersSubtitle: string;
    kpiTotalUsers: string;
    kpiActiveUsers: string;
    kpiPendingUsers: string;
    kpiSuspendedUsers: string;
    searchUsersPlaceholder: string;
    filterAll: string;
    filterPending: string;
    filterActive: string;
    filterSuspended: string;
    createUser: string;
    createNewUser: string;
    userName: string;
    userEmail: string;
    userRole: string;
    roleUser: string;
    roleAdmin: string;
    userPassword: string;
    newPassword: string;
    confirmPassword: string;
    editUser: string;
    resetPassword: string;
    deleteUser: string;
    deleteUserConfirm: string;
    approveUser: string;
    rejectUser: string;
    suspendUser: string;
    activateUser: string;
    forceLogout: string;
    userCreated: string;
    userUpdated: string;
    passwordResetSuccess: string;
    userApproved: string;
    userRejected: string;
    userDeleted: string;
    userForceLoggedOut: string;
    colName: string;
    colEmail: string;
    colRole: string;
    colStatus: string;
    colCreatedAt: string;
    colActions: string;
    noUsersFound: string;
    statusActive: string;
    statusPending: string;
    statusSuspended: string;
    settingsTitle: string;
    settingsSubtitle: string;
    registrationMode: string;
    registrationGovernance: string;
    registrationModeOpen: string;
    registrationModeOpenDesc: string;
    registrationModeApproval: string;
    registrationModeApprovalDesc: string;
    registrationModeInvite: string;
    registrationModeInviteDesc: string;
    platformFeatures: string;
    platformFeaturesHint: string;
    featureSandbox: string;
    featureSandboxDesc: string;
    featurePlayground: string;
    featurePlaygroundDesc: string;
    featureClassroom: string;
    featureClassroomDesc: string;
    featureCompetition: string;
    featureCompetitionDesc: string;
    smtpTitle: string;
    smtpSubtitle: string;
    smtpHost: string;
    smtpPort: string;
    smtpSecure: string;
    smtpUser: string;
    smtpPassword: string;
    smtpFrom: string;
    testSmtp: string;
    testingSmtp: string;
    smtpTestSuccess: string;
    smtpTestFailed: string;
    saveSettings: string;
    savingSettings: string;
    settingsSaved: string;
  };
  sandbox: {
    chooseProject: string;
    noProjects: string;
    addTable: string;
    tableName: string;
    columns: string;
    columnName: string;
    columnType: string;
    primaryKey: string;
    nullable: string;
    references: string;
    referencesNone: string;
    addColumn: string;
    create: string;
    creating: string;
    cancel: string;
    deleteTable: string;
    confirmDeleteTable: string;
    generateData: string;
    rowCount: string;
    generate: string;
    generating: string;
    rowsGenerated: string;
    noTables: string;
    typeText: string;
    typeInteger: string;
    typeDecimal: string;
    typeBoolean: string;
    typeDate: string;
    typeDatetime: string;
    done: string;
    addAnotherHint: string;
    sqlPreview: string;
    referencesHint: string;
    generateSchema: string;
    schemaTemplate: string;
    rowsPerTable: string;
    generateAndSeed: string;
    generatingSchema: string;
    templateBlog: string;
    templateEcommerce: string;
    templateSchool: string;
    schemaGenerated: string;
  };
  common: {
    appName: string;
    tagline: string;
    byLine: string;
    loading: string;
    error: string;
    success: string;
    comingSoon: string;
    cancel: string;
    save: string;
    close: string;
    confirm: string;
    delete: string;
    retry: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    name: string;
    nameRequired: string;
    email: string;
    password: string;
    confirmPassword: string;
    noAccount: string;
    hasAccount: string;
    loginDescription: string;
    welcomeBack: string;
    signUpDescription: string;
    emailInvalid: string;
    passwordTooWeak: string;
    passwordMismatch: string;
    submitting: string;
    passwordRequirements: {
      minLength: string;
      uppercase: string;
      lowercase: string;
      number: string;
    };
    ownerBanner: string;
    pendingApprovalTitle: string;
    pendingApprovalBody: string;
  };
  workspace: {
    kpiSuccessful: string;
    kpiFailed: string;
    kpiDangerous: string;
    kpiImprovable: string;
    kpiSuccessfulHint: string;
    kpiFailedHint: string;
    kpiDangerousHint: string;
    kpiImprovableHint: string;
    sqlEngines: string;
    usageTrend: string;
    quickActions: string;
    actionSandbox: string;
    actionPlayground: string;
    actionGuides: string;
    totalRuns: string;
    avgExecutionTime: string;
    totalAnalysis: string;
    noData: string;
  };
  playground: {
    chooseEngine: string;
    createProject: string;
    openProject: string;
    projectTitle: string;
    projectTitlePlaceholder: string;
    creating: string;
    backToPlayground: string;
    runQuery: string;
    running: string;
    results: string;
    noResultsYet: string;
    rowsReturned: string;
    executionTime: string;
    queryEmptyState: string;
    snippets: string;
    snippetHint: string;
    analysis: string;
    analysisIdle: string;
    noIssues: string;
    tips: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tabAnalysis: string;
    tabExecution: string;
    tabHistory: string;
    recentQueries: string;
    viewAllQueries: string;
    noSavedQueries: string;
    noHistory: string;
    saveQuery: string;
    savingQuery: string;
    queryTitlePrompt: string;
    suggestedRewrite: string;
    useFix: string;
    statusSuccess: string;
    statusError: string;
    statusTimeout: string;
    statusKilled: string;
    goToAdmin: string;
    engineOffline: string;
    tabExplain: string;
    explainQuery: string;
    explaining: string;
  };
  guides: {
    fundamentals: string;
    engines: string;
    backToGuides: string;
    officialResources: string;
  };
  nav: {
    workspace: string;
    sandbox: string;
    playground: string;
    guides: string;
    classroom: string;
    competition: string;
    administration: string;
    notifications: string;
    profile: string;
    settings: string;
    logout: string;
    toggleSidebar: string;
  };
  classroom: Record<string, string>;
  explain: Record<string, string>;
  share: Record<string, string>;
  competition: Record<string, string>;
  profile: Record<string, string>;
  preferences: Record<string, string>;
  notifications: Record<string, string>;
  errors: Record<string, string>;
}

/**
 * English messages dictionary.
 */
export const en: Messages = {
  admin: {
    sandboxEngines: 'Sandbox Engines',
    sandboxEnginesHint:
      'Each engine runs as a single shared server — start it before class, stop it when you’re done to free up resources.',
    engineStatusRunning: 'Running',
    engineStatusStopped: 'Stopped',
    engineStart: 'Start',
    engineStop: 'Stop',
    engineStarting: 'Starting...',
    engineStopping: 'Stopping...',
    engineStartedAt: 'Started',
    tabEngines: 'Engines',
    tabUsers: 'Users & Approvals',
    tabSettings: 'Settings & Modes',
    usersTitle: 'User Directory',
    usersSubtitle: 'Manage institutional accounts, approve pending signups, and govern system roles.',
    kpiTotalUsers: 'Total Users',
    kpiActiveUsers: 'Active',
    kpiPendingUsers: 'Pending Approval',
    kpiSuspendedUsers: 'Suspended',
    searchUsersPlaceholder: 'Search by name or email...',
    filterAll: 'All',
    filterPending: 'Pending',
    filterActive: 'Active',
    filterSuspended: 'Suspended',
    createUser: 'Create User',
    createNewUser: 'New User Account',
    userName: 'Full Name',
    userEmail: 'Email Address',
    userRole: 'Role',
    roleUser: 'Student / User',
    roleAdmin: 'Administrator / Instructor',
    userPassword: 'Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    editUser: 'Edit User',
    resetPassword: 'Change Password',
    deleteUser: 'Delete Account',
    deleteUserConfirm:
      'Are you sure you want to deactivate this account? All active sessions will be terminated immediately.',
    approveUser: 'Approve',
    rejectUser: 'Reject',
    suspendUser: 'Suspend',
    activateUser: 'Reactivate',
    forceLogout: 'Revoke Sessions',
    userCreated: 'User account created successfully.',
    userUpdated: 'User profile updated.',
    passwordResetSuccess: 'Password reset successfully.',
    userApproved: 'User approved and activated.',
    userRejected: 'User registration rejected.',
    userDeleted: 'User account deactivated.',
    userForceLoggedOut: 'Active user sessions revoked.',
    colName: 'User',
    colEmail: 'Email',
    colRole: 'Role',
    colStatus: 'Status',
    colCreatedAt: 'Registered',
    colActions: 'Actions',
    noUsersFound: 'No users match the search criteria.',
    statusActive: 'Active',
    statusPending: 'Pending',
    statusSuspended: 'Suspended',
    settingsTitle: 'Instance Customization',
    settingsSubtitle: 'Configure registration governance, platform modes, and outbound mail gateway.',
    registrationMode: 'Registration Mode',
    registrationGovernance: 'Registration Governance & Access',
    registrationModeOpen: 'Open Registration',
    registrationModeOpenDesc: 'Anyone can sign up and immediately start querying.',
    registrationModeApproval: 'Approval Required',
    registrationModeApprovalDesc: 'Users can sign up but an instructor/admin must approve their account before login.',
    registrationModeInvite: 'Invite / Admin Only',
    registrationModeInviteDesc: 'Public signup is disabled. Only administrators can create accounts.',
    platformFeatures: 'Platform Modes & Feature Flags',
    platformFeaturesHint: 'Enable or disable learning environments across the campus platform.',
    featureSandbox: 'Sandbox Mode',
    featureSandboxDesc: 'Interactive schema inspection and table creation.',
    featurePlayground: 'Playground Mode',
    featurePlaygroundDesc: 'Monaco SQL editor with AST-based static analysis.',
    featureClassroom: 'Classroom & Assignment Mode (NEW)',
    featureClassroomDesc: 'Classroom ecosystem for homework, rubrics, and student submissions.',
    featureCompetition: 'Gamification & Query Golf (NEW)',
    featureCompetitionDesc: 'Query optimization challenges and leaderboard speed runs.',
    smtpTitle: 'Outbound SMTP Mailer',
    smtpSubtitle: 'Used for password recovery and account verification notifications.',
    smtpHost: 'SMTP Host',
    smtpPort: 'SMTP Port',
    smtpSecure: 'Use TLS / Secure Connection',
    smtpUser: 'SMTP Username',
    smtpPassword: 'SMTP Password',
    smtpFrom: 'From Address (Sender)',
    testSmtp: 'Test SMTP Connection',
    testingSmtp: 'Testing...',
    smtpTestSuccess: 'SMTP connection verified successfully.',
    smtpTestFailed: 'SMTP test failed. Please check host, port, or credentials.',
    saveSettings: 'Save Settings',
    savingSettings: 'Saving...',
    settingsSaved: 'Settings saved successfully.',
  },
  sandbox: {
    chooseProject: 'Pick a project to inspect its schema',
    noProjects: 'No projects yet — create one in Playground first.',
    addTable: 'Add Table',
    tableName: 'Table name',
    columns: 'Columns',
    columnName: 'Column name',
    columnType: 'Type',
    primaryKey: 'Primary key',
    nullable: 'Nullable',
    references: 'References',
    referencesNone: 'None',
    addColumn: 'Add column',
    create: 'Create Table',
    creating: 'Creating...',
    cancel: 'Cancel',
    deleteTable: 'Delete table',
    confirmDeleteTable: 'Delete this table and all its data?',
    generateData: 'Generate fake data',
    rowCount: 'Rows',
    generate: 'Generate',
    generating: 'Generating...',
    rowsGenerated: 'rows generated',
    noTables: 'No tables yet — add one to start shaping this schema.',
    typeText: 'Text',
    typeInteger: 'Integer',
    typeDecimal: 'Decimal',
    typeBoolean: 'Boolean',
    typeDate: 'Date',
    typeDatetime: 'Date & Time',
    done: 'Done',
    addAnotherHint: 'The table stays open so you can add the rest of your schema in one go.',
    sqlPreview: 'Preview',
    referencesHint: 'Point a column to another table to draw a foreign key relationship.',
    generateSchema: 'Generate Sample Schema',
    schemaTemplate: 'Template',
    rowsPerTable: 'Rows per table',
    generateAndSeed: 'Generate & Seed',
    generatingSchema: 'Building schema...',
    templateBlog: 'Blog (authors, posts, comments)',
    templateEcommerce: 'E-commerce (customers, products, orders)',
    templateSchool: 'School (students, courses, enrollments)',
    schemaGenerated: 'Schema generated with sample data.',
  },
  common: {
    appName: 'Bubble Catcher',
    tagline: 'Educational SQL Analysis Platform',
    byLine: 'Designed by Sxnnyside Scholarships',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    comingSoon: 'This screen is under construction — check back soon.',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    confirm: 'Confirm',
    delete: 'Delete',
    retry: 'Retry',
  },
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    name: 'Name',
    nameRequired: 'Enter your name.',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    loginDescription: 'Analyze, optimize, and learn SQL with our educational platform.',
    welcomeBack: 'Welcome back to your platform!',
    signUpDescription: 'Create your account to start learning.',
    emailInvalid: 'Enter a valid email address.',
    passwordTooWeak:
      'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
    passwordMismatch: 'Passwords do not match.',
    submitting: 'Please wait...',
    passwordRequirements: {
      minLength: 'At least 8 characters',
      uppercase: 'One uppercase letter',
      lowercase: 'One lowercase letter',
      number: 'One number',
    },
    ownerBanner: "You're the first account on this instance — you've been made the owner (admin).",
    pendingApprovalTitle: 'Account created',
    pendingApprovalBody:
      'An administrator needs to approve your account before you can sign in. You’ll be notified by email once it’s approved.',
  },
  workspace: {
    kpiSuccessful: 'Successful',
    kpiFailed: 'Failed',
    kpiDangerous: 'Dangerous',
    kpiImprovable: 'Improvable',
    kpiSuccessfulHint: 'Ran clean, no issues found',
    kpiFailedHint: "Didn't execute at all",
    kpiDangerousHint: 'Blocked for unsafe operations',
    kpiImprovableHint: 'Timed out — needs optimization',
    sqlEngines: 'SQL Engines Usage',
    usageTrend: 'Executions — Last 7 Days',
    quickActions: 'Quick Actions',
    actionSandbox: 'Open Sandbox',
    actionPlayground: 'Open Playground',
    actionGuides: 'Browse Guides',
    totalRuns: 'Total Runs',
    avgExecutionTime: 'Avg. Execution Time',
    totalAnalysis: 'Total Analyses',
    noData: 'No activity yet — run your first query to see it here.',
  },
  playground: {
    chooseEngine: 'Choose an engine to start your schema',
    createProject: 'Create Project',
    openProject: 'Open',
    projectTitle: 'Project name',
    projectTitlePlaceholder: 'My schema',
    creating: 'Creating...',
    backToPlayground: 'Back to Playground',
    runQuery: 'Run Query',
    running: 'Running...',
    results: 'Results',
    noResultsYet: 'Run a query to see results here.',
    rowsReturned: 'rows',
    executionTime: 'Execution time',
    queryEmptyState: 'Write a query above and press Run Query.',
    snippets: 'Snippets',
    snippetHint: 'Drag into the editor, or click to insert',
    analysis: 'Analysis',
    analysisIdle: 'Analysis runs automatically as you type.',
    noIssues: 'No issues found in this query.',
    tips: 'Tips',
    tip1: 'Always filter UPDATE/DELETE with a WHERE clause.',
    tip2: 'Avoid SELECT * in production queries — name the columns you need.',
    tip3: 'Press Ctrl/Cmd+Enter to run the query without leaving the editor.',
    tabAnalysis: 'Analysis',
    tabExecution: 'Execution',
    tabHistory: 'History',
    recentQueries: 'Recent',
    viewAllQueries: 'View all',
    noSavedQueries: "You haven't saved any queries yet.",
    noHistory: 'No executions yet for this project.',
    saveQuery: 'Save Query',
    savingQuery: 'Saving...',
    queryTitlePrompt: 'Name this query',
    suggestedRewrite: 'Suggested rewrite',
    useFix: 'Use this fix',
    statusSuccess: 'Success',
    statusError: 'Error',
    statusTimeout: 'Timed out',
    statusKilled: 'Killed by sandbox',
    goToAdmin: 'Go to Administration',
    engineOffline: 'This database engine is stopped.',
    tabExplain: 'Explain Plan',
    explainQuery: 'Explain Plan',
    explaining: 'Analyzing Plan...',
  },
  explain: {
    executionTime: 'Total Execution Time',
    planningTime: 'Planning Time',
    totalCost: 'Total Cost',
    rootOperation: 'Top-Level Operation',
    viewTree: 'Visual Tree',
    viewRaw: 'Raw Text',
    reRun: 'Re-run EXPLAIN ANALYZE',
    heatmapLegend: 'Cost Heatmap',
    hotBottleneck: 'Bottleneck (High Cost / Latency)',
    moderateCost: 'Moderate Impact',
    optimalCost: 'Optimal Execution',
    analyzingPlan: 'Executing and parsing EXPLAIN ANALYZE...',
    errorTitle: 'EXPLAIN Execution Failed',
    emptyStatePrompt: 'Inspect the query planner operations (Seq Scan, Index Seek, Hash Join) and latency heatmap.',
    explainButton: 'Run EXPLAIN ANALYZE',
    timeLabel: 'Actual Time',
    costLabel: 'Cost',
    rowsLabel: 'Rows',
    loopsLabel: 'Loops',
    bottleneckAlert: 'Query Bottleneck',
  },
  share: {
    shareButton: 'Share',
    modalTitle: 'Share Query & Schema',
    description:
      'Create a stateful permalink to share your SQL query and schema tables with instructors and classmates.',
    titleLabel: 'Query Title / Summary',
    titlePlaceholder: 'e.g. Question regarding slow Hash Join in Lab 2',
    notesLabel: 'Notes or Questions (Optional)',
    notesPlaceholder: 'Add context, questions or observations for peers and teachers...',
    generateButton: 'Create Share Link',
    successNotice: 'Shareable Permalink Ready',
    permalinkExplanation:
      'Anyone with this link can inspect, run, explain, and fork this query with its sandbox schema.',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    sharedBy: 'Shared by {author}',
    loadSql: 'Load into Editor',
  },
  guides: {
    fundamentals: 'SQL Fundamentals',
    engines: 'Database Engines',
    backToGuides: 'Back to Guides',
    officialResources: 'Official Resources',
  },
  nav: {
    workspace: 'Workspace',
    sandbox: 'Sandbox',
    playground: 'Playground',
    guides: 'Guides',
    classroom: 'Classroom',
    competition: 'Competition',
    administration: 'Administration',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log Out',
    toggleSidebar: 'Toggle sidebar',
  },
  classroom: {
    title: 'Classrooms & Assignments',
    subtitle: 'Interactive SQL labs with automated result matching, AST analysis, and performance benchmarking.',
    coursesTab: 'Courses',
    joinCourse: 'Join Course',
    createCourse: 'New Course',
    courseTitle: 'Course Title',
    courseDescription: 'Course Description',
    joinCodePrompt: 'Enter 6-character course code',
    joinCodeLabel: 'Join Code',
    enrollSuccess: 'Enrolled in course successfully.',
    courseCreated: 'Course created successfully.',
    noCourses: 'No courses found. Join a course with an access code or create one.',
    assignments: 'Assignments',
    createAssignment: 'New Assignment',
    assignmentTitle: 'Assignment Title',
    assignmentDescription: 'Instructions & Problem Statement',
    selectDialect: 'Database Dialect',
    initialSchemaSql: 'Initial Schema DDL / Seed SQL',
    initialSchemaHint: 'Tables and sample rows preloaded into the sandbox before the student executes their query.',
    referenceQuerySql: 'Reference Solution SQL (Ground Truth)',
    referenceQueryHint: 'Query executed against the schema to produce the target result set for tuple comparison.',
    maxScore: 'Max Points',
    dueDate: 'Due Date',
    assignmentCreated: 'Assignment published successfully.',
    noAssignments: 'No assignments published for this course yet.',
    solveAssignment: 'Open Lab Workspace',
    testQuery: 'Test Query',
    testingQuery: 'Evaluating...',
    submitAssignment: 'Submit for Grading',
    submittingAssignment: 'Submitting...',
    submissionConfirmed: 'Assignment submitted and graded successfully.',
    tupleMatchResult: 'Tuple Equivalence',
    astValidationResult: 'AST Code Quality',
    performanceResult: 'Performance & Latency',
    totalScore: 'Final Score',
    viewSubmissions: 'Submissions Monitor',
    waitingRoom: 'Student Submissions & Live Grades',
    studentCol: 'Student',
    scoreCol: 'Score',
    tupleCheckCol: 'Tuples',
    astCheckCol: 'AST Clean',
    latencyCol: 'Latency',
    dateCol: 'Submitted',
    noSubmissions: 'No students have submitted this assignment yet.',
    passedBadge: 'Passed',
    needsWorkBadge: 'Needs Work',
    instructionsTab: 'Instructions & Schema',
    editorTab: 'SQL Solution',
    resultsTab: 'Evaluation Report',
    labInstructions: 'Lab Instructions',
    initialSchemaSection: 'Initial Schema & Seed SQL',
    testOrSubmitNotice: 'Run "Test Query" or "Submit for Grading" to receive real-time automated evaluation.',
    excellentWork: 'Excellent Work!',
    evaluationCompleted: 'Evaluation Completed',
    tuplesIdentical: 'Identical Tuples',
    tuplesMismatch: 'Row Mismatch',
    returnedRowsComparison: 'Returned: {returned} | Expected: {expected}',
    zeroAntiPatterns: '0 Anti-patterns',
    astViolationsCount: '{count} Violations',
    referenceTeacherTime: 'Teacher reference: {time} ms',
    returnedRowsPreview: 'Returned Rows Preview',
    submissionsCount: '{count} submissions',
    defaultStudent: 'Student',
    tuplePassedBadge: 'Passed',
    tupleFailedBadge: 'Error',
    cleanBadge: 'Clean',
    failuresBadge: '{count} Failures',
    monitorButton: 'Monitor',
    assignmentTitlePlaceholder: 'e.g. Lab 1: Sales Analysis Queries',
    assignmentDescriptionPlaceholder: 'Assignment instructions and task description for students...',
  },
  competition: {
    title: 'Query Golf & Optimization Arena',
    subtitle: 'Compete to solve SQL challenges with the fewest buffer reads and lowest execution time.',
    ruleBuffers: 'Lower Buffer I/O = Better Score',
    ruleTuples: 'Strict Tuple Matching',
    selectChallenge: 'Select a Challenge',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    parTarget: 'Par',
    best: 'Best',
    unattempted: 'Unattempted',
    parBuffers: 'Target Buffers',
    parLatency: 'Target Latency',
    viewSchema: 'View Schema & Initial Tables',
    hideSchema: 'Hide Schema',
    solutionEditor: 'Your Optimized SQL Query',
    benchmark: 'Test & Benchmark',
    benchmarking: 'Measuring...',
    submitLeaderboard: 'Submit to Leaderboard',
    submitting: 'Submitting...',
    tabScorecard: 'Golf Scorecard',
    tabLeaderboard: 'Live Leaderboard',
    tabTuples: 'Returned Tuples',
    runBenchmarkPrompt: 'Write your query and click "Test & Benchmark" to view your Golf performance scorecard.',
    leaderboardTitle: 'Leaderboard',
    rankedByBuffers: 'Ranked by fewest buffer reads & lowest latency',
    noSubmissionsYet: 'No submissions yet for this challenge',
    beFirstToSolve: 'Be the first to solve it with minimal buffers!',
    rank: 'Rank',
    student: 'Student',
    buffers: 'Buffers',
    latency: 'Time',
    chars: 'Chars',
    score: 'Score',
    date: 'Date',
    you: 'YOU',
    parHoleInOne: 'HOLE IN ONE (-3)',
    parEagle: 'EAGLE (-2)',
    parBirdie: 'BIRDIE (-1)',
    parPar: 'PAR (E)',
    parBogey: 'BOGEY',
    tuplesMatched: 'Tuples Matched',
    tuplesMismatched: 'Tuples Mismatched',
    submissionSaved: 'Record Saved to Leaderboard!',
    buffersRead: 'Buffers Read',
    executionTime: 'Execution Time',
    queryChars: 'Query Length',
    astHealth: 'AST Health',
    astClean: 'Clean',
    astIssuesCount: 'Issues',
    astWarningsTitle: 'Anti-patterns detected in AST:',
    noChallengesTitle: 'No Challenges Available',
    noChallengesDesc: 'Optimization challenges will appear here once configured by instructors.',
    runBenchmarkHint: 'Execute your SQL against the isolated engine to measure buffer reads and latency.',
    leaderboardLoading: 'Loading rankings...',
  },
  profile: {
    title: 'User Profile & Metrics',
    subtitle: 'Track your query efficiency, sandboxed executions, and educational journey.',
    avatarAlt: 'User Avatar',
    roleAdmin: 'System Administrator',
    roleUser: 'Student / Learner',
    statusActive: 'Active Account',
    statusSuspended: 'Suspended Account',
    statusPending: 'Pending Approval',
    verifiedBadge: 'Verified Email',
    unverifiedBadge: 'Unverified Email',
    metricsTitle: 'Performance & Execution Telemetry',
    metricsSubtitle: 'Real-time telemetry gathered across your sandboxed query sessions.',
    totalQueries: 'Total Executions',
    totalAnalyses: 'AST Analyses',
    successRate: 'Success Rate',
    avgExecutionTime: 'Avg Latency',
    topEngine: 'Preferred Engine',
    securityTitle: 'Account Security & Credentials',
    securitySubtitle: 'Manage your password, login sessions, and authentication security.',
    currentPasswordLabel: 'Current Password',
    currentPasswordPlaceholder: 'Enter current password...',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Enter at least 8 characters...',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Repeat new password...',
    changePasswordButton: 'Change Password',
    updatingPassword: 'Updating...',
    passwordSuccess: 'Password changed successfully. Other active sessions were revoked.',
    passwordMismatch: 'New passwords do not match.',
    ruleMinLength: 'At least 8 characters',
    ruleMatch: 'Passwords match',
    passwordModalTitle: 'Change Account Password',
    passwordModalSubtitle: 'Choose a strong, unique password to secure your educational workspace.',
    securityStatusProtected: 'Protected',
    securityLastUpdated: 'Password is set and active',
    displayNameLabel: 'Display Name',
    displayNamePlaceholder: 'Your preferred display name...',
    emailLabel: 'Account Email',
    updateProfileButton: 'Save Changes',
    savingProfile: 'Saving...',
    profileUpdated: 'Profile updated successfully.',
    sessionStatus: 'Current Device Session',
    sessionDetails: 'Active and authenticated on this device. Sessions renew automatically.',
    engineBreakdown: 'Dialect Usage Distribution',
    healthBreakdown: 'Execution Quality & AST Safety',
    cleanRuns: 'Optimal & Clean AST',
    guardedRuns: 'Dangerous Queries Guarded',
    improvableRuns: 'Optimization Opportunities',
    failedRuns: 'Syntax / Runtime Errors',
    recentActivity: '7-Day Execution Trend',
  },
  preferences: {
    title: 'Settings & Interface',
    subtitle: 'Customize theme appearance, SQL editor behaviors, and interface language.',
    themeTitle: 'Theme & Visual Aesthetics',
    themeSubtitle: 'Choose between the signature bubblemorphism or high-contrast modes.',
    themeColorful: 'Bubble Colorful',
    themeColorfulBadge: 'Signature',
    themeColorfulDesc: 'Rich cosmic bubblemorphic gradient with vibrant pink, violet and cyan gloss.',
    themeLight: 'Clean Light Mode',
    themeLightBadge: 'High Contrast',
    themeLightDesc: 'Crisp white canvas, high-legibility dark typography, and soft neutral shadows.',
    themeDark: 'Obsidian Dark Mode',
    themeDarkBadge: 'Low Eyestrain',
    themeDarkDesc: 'Deep charcoal background, dimmed borders, and calm amethyst accents.',
    editorTitle: 'SQL Editor Configuration',
    editorSubtitle: 'Tune code font sizing, formatting behaviors, and security guardrails.',
    fontSizeLabel: 'Code Font Size',
    fontSizeDesc: 'Adjust the font size of the Monaco/CodeMirror SQL query editor.',
    confirmDangerousLabel: 'Confirm Destructive SQL',
    confirmDangerousDesc: 'Show a confirmation dialog before executing DROP, TRUNCATE, or ALTER statements.',
    autoFormatLabel: 'Auto-Format on Execute',
    autoFormatDesc: 'Automatically clean indentation and normalize SQL keywords before sending to engine.',
    languageTitle: 'Language & Locale',
    languageSubtitle: 'Select your preferred language for the interface and database guides.',
    diagnosticsTitle: 'Self-Hosted Runtime Diagnostics',
    diagnosticsSubtitle: 'Underlying infrastructure, security isolation, and compiler specifications.',
    engineRuntime: 'API Runtime Engine',
    sandboxMode: 'Sandbox Security Policy',
    astRulesActive: 'Static Analysis Rules',
    platformVersion: 'System Version',
  },
  notifications: {
    title: 'Notifications',
    newBadge: '{count} new',
    empty: 'No pending notifications',
    emptySubtitle: 'You will receive alerts when administrators start engines or enable platform modes.',
    markAllRead: 'Mark all read',
    clearAll: 'Clear history',
    engineStarted: 'Engine {dialect} online',
    engineStartedBody: 'Sandbox container for {dialect} was started by administrator and is ready for queries.',
    engineStopped: 'Engine {dialect} stopped',
    engineStoppedBody: 'Sandbox container for {dialect} was stopped by administrator.',
    modeEnabled: 'Mode {mode} enabled',
    modeEnabledBody: 'Administrator enabled {mode} mode across the platform.',
    modeDisabled: 'Mode {mode} disabled',
    modeDisabledBody: 'Administrator disabled {mode} mode.',
    justNow: 'Just now',
  },
  errors: {
    BAD_REQUEST: 'Invalid request.',
    UNAUTHORIZED: 'Authentication required. Please sign in.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'The requested resource was not found.',
    CONFLICT: 'A conflict occurred.',
    VALIDATION_ERROR: 'Invalid request data.',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment.',
    INVALID_CREDENTIALS: 'Incorrect email or password.',
    EMAIL_ALREADY_REGISTERED: 'This email is already registered.',
    ACCOUNT_SUSPENDED: 'This account has been suspended.',
    ACCOUNT_PENDING_APPROVAL: 'Your account is still awaiting administrator approval.',
    REGISTRATION_DISABLED: 'New account registration is currently disabled on this instance.',
    INVALID_REFRESH_TOKEN: 'Your session expired. Please sign in again.',
    PROJECT_DIALECT_EXISTS: 'You already have a project for this engine.',
    PROJECT_LIMIT: "You've reached the maximum number of projects.",
    DIALECT_DISABLED: 'This engine has been disabled by the administrator.',
    QUERY_TOO_EXPENSIVE: 'This query was blocked as too expensive to run.',
    EMPTY_QUERY: 'Write a query before running it.',
    QUERY_LENGTH_EXCEEDED: 'This query is too long.',
    INVALID_IDENTIFIER: 'Names must start with a letter and contain only letters, digits, and underscores.',
    TABLE_ALREADY_EXISTS: 'A table with this name already exists.',
    EMPTY_TABLE: 'A table needs at least one column.',
    MULTIPLE_PRIMARY_KEYS: 'Only one primary key column is supported.',
    SCHEMA_OPERATION_FAILED: 'This operation could not be applied to the sandbox database.',
    SANDBOX_OFFLINE: "This engine isn't running. Ask an administrator to start it from the Administration panel.",
    ENGINE_START_FAILED: 'Failed to start this engine — check that Docker is running and the images are built.',
  },
};
