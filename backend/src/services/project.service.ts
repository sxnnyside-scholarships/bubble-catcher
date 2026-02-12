import { createUserClient, supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  SavedQuery,
  CreateSavedQueryPayload,
  UpdateSavedQueryPayload,
} from '@shared/types';
import { MAX_PROJECTS_FREE, isSupportedDialect, isEnterpriseDialect } from '@shared/types';

export class ProjectService {
  /** Get all projects for a user */
  async listProjects(userId: string, accessToken: string): Promise<Project[]> {
    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    return (data ?? []).map(mapProjectRow);
  }

  /** Get a single project by ID */
  async getProject(userId: string, projectId: string, accessToken: string): Promise<Project> {
    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw AppError.notFound('NOT_FOUND');
    return mapProjectRow(data);
  }

  /** Create a new project, enforcing limits */
  async createProject(userId: string, payload: CreateProjectPayload, accessToken: string): Promise<Project> {
    /* Validate dialect */
    if (isEnterpriseDialect(payload.dialect)) {
      throw AppError.forbidden('ENTERPRISE_REQUIRED', { dialect: payload.dialect });
    }
    if (!isSupportedDialect(payload.dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect: payload.dialect });
    }

    /* Enforce project limit */
    const userPlan = await this.getUserPlan(userId);
    if (userPlan === 'free') {
      const count = await this.getProjectCount(userId);
      if (count >= MAX_PROJECTS_FREE) {
        throw AppError.limitReached('PROJECT_LIMIT', { max: MAX_PROJECTS_FREE, plan: userPlan });
      }
    }

    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_projects')
      .insert({
        user_id: userId,
        title: payload.title,
        description: payload.description,
        dialect: payload.dialect,
      })
      .select('*')
      .single();

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    if (!data) throw AppError.internal('INTERNAL_ERROR');
    return mapProjectRow(data);
  }

  /** Update an existing project */
  async updateProject(userId: string, projectId: string, payload: UpdateProjectPayload, accessToken: string): Promise<Project> {
    if (payload.dialect) {
      if (isEnterpriseDialect(payload.dialect)) {
        throw AppError.forbidden('ENTERPRISE_REQUIRED', { dialect: payload.dialect });
      }
      if (!isSupportedDialect(payload.dialect)) {
        throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect: payload.dialect });
      }
    }

    const client = createUserClient(accessToken);
    const updateData: Record<string, unknown> = {};
    if (payload.title !== undefined) updateData['title'] = payload.title;
    if (payload.description !== undefined) updateData['description'] = payload.description;
    if (payload.dialect !== undefined) updateData['dialect'] = payload.dialect;

    const { data, error } = await client
      .from('bubble_projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) throw AppError.notFound('NOT_FOUND');
    return mapProjectRow(data);
  }

  /** Delete a project */
  async deleteProject(userId: string, projectId: string, accessToken: string): Promise<void> {
    const client = createUserClient(accessToken);
    const { error } = await client
      .from('bubble_projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
  }

  /** Get saved queries for a project */
  async listQueries(userId: string, projectId: string, accessToken: string): Promise<SavedQuery[]> {
    /* Verify project ownership */
    await this.getProject(userId, projectId, accessToken);

    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_saved_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    return (data ?? []).map(mapQueryRow);
  }

  /** Get recent queries for a project, limited to N */
  async recentQueries(userId: string, projectId: string, accessToken: string, limit = 5): Promise<SavedQuery[]> {
    await this.getProject(userId, projectId, accessToken);

    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_saved_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    return (data ?? []).map(mapQueryRow);
  }

  /** Create a saved query */
  async createQuery(userId: string, payload: CreateSavedQueryPayload, accessToken: string): Promise<SavedQuery> {
    await this.getProject(userId, payload.projectId, accessToken);

    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_saved_queries')
      .insert({
        project_id: payload.projectId,
        title: payload.title,
        sql: payload.sql,
      })
      .select('*')
      .single();

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    if (!data) throw AppError.internal('INTERNAL_ERROR');
    return mapQueryRow(data);
  }

  /** Update a saved query */
  async updateQuery(userId: string, projectId: string, queryId: string, payload: UpdateSavedQueryPayload, accessToken: string): Promise<SavedQuery> {
    await this.getProject(userId, projectId, accessToken);

    const client = createUserClient(accessToken);
    const updateData: Record<string, unknown> = {};
    if (payload.title !== undefined) updateData['title'] = payload.title;
    if (payload.sql !== undefined) updateData['sql'] = payload.sql;

    const { data, error } = await client
      .from('bubble_saved_queries')
      .update(updateData)
      .eq('id', queryId)
      .eq('project_id', projectId)
      .select('*')
      .single();

    if (error || !data) throw AppError.notFound('NOT_FOUND');
    return mapQueryRow(data);
  }

  /** Delete a saved query */
  async deleteQuery(userId: string, projectId: string, queryId: string, accessToken: string): Promise<void> {
    await this.getProject(userId, projectId, accessToken);

    const client = createUserClient(accessToken);
    const { error } = await client
      .from('bubble_saved_queries')
      .delete()
      .eq('id', queryId)
      .eq('project_id', projectId);

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
  }

  private async getProjectCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('bubble_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    return count ?? 0;
  }

  private async getUserPlan(userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('bubble_profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (error || !data) return 'free';
    return (data as { plan: string }).plan ?? 'free';
  }
}

function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    title: row['title'] as string,
    description: row['description'] as string,
    dialect: row['dialect'] as Project['dialect'],
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function mapQueryRow(row: Record<string, unknown>): SavedQuery {
  return {
    id: row['id'] as string,
    projectId: row['project_id'] as string,
    title: row['title'] as string,
    sql: row['sql'] as string,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

export const projectService = new ProjectService();
