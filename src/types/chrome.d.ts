// Type declaration for the Chrome extension manifest
declare namespace chrome.runtime {
  interface Manifest {
    name: string;
    version: string;
    description: string;
    manifest_version: number;
    permissions: string[];
    host_permissions?: string[];
    background?: {
      service_worker: string;
      type?: string;
    };
    action?: {
      default_popup: string;
      default_icon: {
        [key: string]: string;
      };
    };
    content_scripts?: Array<{
      matches: string[];
      js: string[];
      css?: string[];
      run_at?: string;
    }>;
    web_accessible_resources?: Array<{
      resources: string[];
      matches: string[];
    }>;
    icons?: {
      [key: string]: string;
    };
  }
}
