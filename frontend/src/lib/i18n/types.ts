export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
}

export interface Translations {
  common: {
    appName: string;
    tagline: string;
    byLine: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    create: string;
    update: string;
    confirm: string;
    back: string;
    close: string;
    error: string;
    success: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
    loginRequired: string;
    loginDescription: string;
  };
  nav: {
    dashboard: string;
    projects: string;
    pricing: string;
    settings: string;
    logout: string;
  };
  dashboard: {
    title: string;
    welcome: string;
    recentProjects: string;
    quickActions: string;
    newProject: string;
    noProjects: string;
    totalProjects: string;
    totalQueries: string;
    totalExecutions: string;
  };
  projects: {
    title: string;
    create: string;
    editProject: string;
    deleteProject: string;
    deleteConfirm: string;
    projectTitle: string;
    projectDescription: string;
    projectDialect: string;
    limitReached: string;
    upgradePrompt: string;
    noQueries: string;
    savedQueries: string;
    executionHistory: string;
  };
  editor: {
    analyzeQuery: string;
    executeQuery: string;
    saveQuery: string;
    queryTitle: string;
    placeholder: string;
  };
  analysis: {
    title: string;
    noIssues: string;
    parseError: string;
    severity: {
      info: string;
      warning: string;
      error: string;
      critical: string;
    };
    suggestedRewrite: string;
    explanation: string;
  };
  execution: {
    title: string;
    running: string;
    success: string;
    error: string;
    timeout: string;
    rows: string;
    columns: string;
    executionTime: string;
    noResults: string;
    history: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    free: PricingPlan;
    premium: PricingPlan;
    enterprise: PricingPlan;
  };
  settings: {
    title: string;
    theme: string;
    themeColorful: string;
    themeLight: string;
    themeDark: string;
    language: string;
    languageEn: string;
    languageEs: string;
    account: string;
    plan: string;
  };
  dialects: {
    mysql: string;
    mariadb: string;
    postgresql: string;
    sqlite: string;
    mssql: string;
    oracle: string;
  };
}
