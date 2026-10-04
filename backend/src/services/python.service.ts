import axios from 'axios';

export interface PythonHealthResponse {
  success: boolean;
  service: string;
  status: string;
  error?: string;
}

export interface AgentRunRequest {
  message: string;
}

export interface MlResult {
  status: 'UNTRAINED' | 'READY';
  prediction: 'SAFE' | 'THREAT' | null;
  confidence: number | null;
  training_samples: number;
  message: string;
  label_recorded?: string;
}

export interface AgentRunResponse {
  success: boolean;
  response: string;
  scope?: Record<string, any>;
  retrieved_context: Array<{ source_id: string; text: string; firewall_status?: string }>;
  firewall_result?: Record<string, any>;
  action_guard_result?: Record<string, any>;
  tool_used: string | null;
  tool_result: string | null;
  tool_calls?: Array<{ tool: string; arguments: any }>;
  tool_results?: Array<{ tool: string; result: any }>;
  error?: string;
  threat_detected?: boolean;
  action_blocked?: boolean;
  ml_result?: MlResult;
}

export class PythonService {
  private static getBaseUrl(): string {
    const host = process.env.PYTHON_HOST || '127.0.0.1';
    const port = process.env.PYTHON_PORT || '8000';
    return `http://${host}:${port}`;
  }

  public static async getHealth(): Promise<PythonHealthResponse> {
    try {
      const url = `${this.getBaseUrl()}/health`;
      const response = await axios.get<PythonHealthResponse>(url, {
        timeout: 3000,
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error connecting to Python service';
      return {
        success: false,
        service: 'promptwall-python',
        status: 'unavailable',
        error: errorMessage,
      };
    }
  }

  public static async runAgent(payload: AgentRunRequest): Promise<AgentRunResponse> {
    try {
      const url = `${this.getBaseUrl()}/agent/run`;
      const response = await axios.post<AgentRunResponse>(url, payload, {
        timeout: 30000,
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error from Python agent';
      return {
        success: false,
        response: '',
        retrieved_context: [],
        tool_used: null,
        tool_result: null,
        error: errorMessage,
      };
    }
  }

  public static async mlPredict(text: string): Promise<MlResult> {
    const response = await axios.post<{ result: MlResult }>(
      `${this.getBaseUrl()}/ml/predict`,
      { text },
      { timeout: 10000 }
    );
    return response.data.result;
  }

  public static async mlFeedback(text: string, label: 'SAFE' | 'THREAT'): Promise<MlResult> {
    const response = await axios.post<{ result: MlResult }>(
      `${this.getBaseUrl()}/ml/feedback`,
      { text, label },
      { timeout: 10000 }
    );
    return response.data.result;
  }

  public static async getAuditEvents(): Promise<Array<Record<string, any>>> {
    const response = await axios.get<{ events: Array<Record<string, any>> }>(
      `${this.getBaseUrl()}/audit/events`,
      { timeout: 10000 }
    );
    return response.data.events;
  }

  public static async getRulebookInfo(): Promise<Record<string, any>> {
    try {
      const url = `${this.getBaseUrl()}/rulebook/info`;
      const response = await axios.get(url, { timeout: 3000 });
      return response.data;
    } catch (error: unknown) {
      return { success: false, error: 'Failed to fetch Rulebook info from Python engine' };
    }
  }

  public static async runEvaluation(): Promise<Record<string, any>> {
    try {
      const url = `${this.getBaseUrl()}/evaluation/run`;
      // Evaluation suite runs all 19 test cases — needs long timeout
      const response = await axios.post(url, {}, { timeout: 300000 });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Evaluation run failed';
      return { success: false, error: errorMessage };
    }
  }

  public static async getLatestEvaluation(): Promise<Record<string, any>> {
    try {
      const url = `${this.getBaseUrl()}/evaluation/latest`;
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch latest evaluation';
      return { success: false, error: errorMessage };
    }
  }
}
