-- Agent Orchestration System Tables
-- Provides shared memory, status tracking, and audit logs for multi-agent system

-- 1. Agent Memory (shared state for all agents)
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  agent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  version INT DEFAULT 1
);

CREATE INDEX idx_agent_memory_key ON public.agent_memory(key);
CREATE INDEX idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX idx_agent_memory_updated_at ON public.agent_memory(updated_at DESC);

-- 2. Agent Status (execution tracking)
CREATE TABLE IF NOT EXISTS public.agent_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  stage TEXT NOT NULL, -- 'development', 'deployment', 'data_pipeline', 'security'
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  duration_ms INT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  orchestration_run_id UUID REFERENCES public.orchestration_runs(id)
);

CREATE INDEX idx_agent_status_stage ON public.agent_status(stage);
CREATE INDEX idx_agent_status_status ON public.agent_status(status);
CREATE INDEX idx_agent_status_agent_name ON public.agent_status(agent_name);
CREATE INDEX idx_agent_status_orchestration ON public.agent_status(orchestration_run_id);

-- 3. Orchestration Runs (track full lifecycle executions)
CREATE TABLE IF NOT EXISTS public.orchestration_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_type TEXT NOT NULL CHECK (run_type IN ('full_lifecycle', 'data_pipeline', 'deployment', 'security_audit')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by TEXT, -- 'user', 'cli', 'scheduled'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orchestration_runs_type ON public.orchestration_runs(run_type);
CREATE INDEX idx_orchestration_runs_status ON public.orchestration_runs(status);
CREATE INDEX idx_orchestration_runs_started_at ON public.orchestration_runs(started_at DESC);

-- 4. Token Usage (budget tracking & reporting)
CREATE TABLE IF NOT EXISTS public.token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchestration_run_id UUID REFERENCES public.orchestration_runs(id),
  agent_name TEXT NOT NULL,
  api_type TEXT NOT NULL CHECK (api_type IN ('claude_input', 'claude_output', 'museum_api', 'supabase', 'other')),
  tokens_used INT NOT NULL,
  cost_cents INT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_usage_run ON public.token_usage(orchestration_run_id);
CREATE INDEX idx_token_usage_agent ON public.token_usage(agent_name);
CREATE INDEX idx_token_usage_type ON public.token_usage(api_type);

-- 5. Pipeline Logs (orchestration history & recommendations)
CREATE TABLE IF NOT EXISTS public.pipeline_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchestration_run_id UUID REFERENCES public.orchestration_runs(id),
  log_level TEXT NOT NULL CHECK (log_level IN ('error', 'warning', 'success', 'info', 'debug')),
  message TEXT NOT NULL,
  stage TEXT,
  agent_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pipeline_logs_run ON public.pipeline_logs(orchestration_run_id);
CREATE INDEX idx_pipeline_logs_level ON public.pipeline_logs(log_level);
CREATE INDEX idx_pipeline_logs_stage ON public.pipeline_logs(stage);
CREATE INDEX idx_pipeline_logs_timestamp ON public.pipeline_logs(created_at DESC);

-- 6. Recommendations (actionable feedback from agents)
CREATE TABLE IF NOT EXISTS public.agent_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchestration_run_id UUID REFERENCES public.orchestration_runs(id),
  agent_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'performance', 'security', 'quality', 'optimization'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  action_items TEXT[],
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_recommendations_run ON public.agent_recommendations(orchestration_run_id);
CREATE INDEX idx_recommendations_agent ON public.agent_recommendations(agent_name);
CREATE INDEX idx_recommendations_severity ON public.agent_recommendations(severity);
CREATE INDEX idx_recommendations_status ON public.agent_recommendations(status);

-- Row-Level Security Policies
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow service role (agents) to read/write
CREATE POLICY agent_memory_rls ON public.agent_memory
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY agent_status_rls ON public.agent_status
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY orchestration_runs_rls ON public.orchestration_runs
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY token_usage_rls ON public.token_usage
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY pipeline_logs_rls ON public.pipeline_logs
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY recommendations_rls ON public.agent_recommendations
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Utility function: Get current run stats
CREATE OR REPLACE FUNCTION get_orchestration_stats(run_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_agents', (SELECT COUNT(*) FROM agent_status WHERE orchestration_run_id = run_id),
    'completed', (SELECT COUNT(*) FROM agent_status WHERE orchestration_run_id = run_id AND status = 'completed'),
    'failed', (SELECT COUNT(*) FROM agent_status WHERE orchestration_run_id = run_id AND status = 'failed'),
    'total_tokens', (SELECT COALESCE(SUM(tokens_used), 0) FROM token_usage WHERE orchestration_run_id = run_id),
    'recommendations', (SELECT COUNT(*) FROM agent_recommendations WHERE orchestration_run_id = run_id AND status = 'open')
  );
END;
$$ LANGUAGE plpgsql;
