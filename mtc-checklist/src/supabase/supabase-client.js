/**
 * API Client for AKG Maintenance App
 * Communicates with Flask backend (MySQL database)
 * Replaces Supabase client
 */

const API_URL = "http://localhost:5000/api";

// Store token in localStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

class APIClient {
    constructor() {
        this.token = localStorage.getItem(TOKEN_KEY);
    }

    // Helper to make API calls
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return await response.json();
    }

    // ============================================
    // AUTH METHODS
    // ============================================

    auth = {
        // Sign Up
        signUp: async (email, password, fullName) => {
            try {
                const response = await this.request('/auth/signup', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        full_name: fullName || email,
                    }),
                });

                // Store token and user info
                localStorage.setItem(TOKEN_KEY, response.token);
                localStorage.setItem(USER_KEY, JSON.stringify(response.user));
                this.token = response.token;

                return {
                    data: { user: response.user },
                    error: null,
                };
            } catch (error) {
                return {
                    data: null,
                    error: { message: error.message },
                };
            }
        },

        // Sign In
        signInWithPassword: async (email, password) => {
            try {
                const response = await this.request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });

                // Store token and user info
                localStorage.setItem(TOKEN_KEY, response.token);
                localStorage.setItem(USER_KEY, JSON.stringify(response.user));
                this.token = response.token;

                return {
                    data: { user: response.user },
                    error: null,
                };
            } catch (error) {
                return {
                    data: null,
                    error: { message: error.message },
                };
            }
        },

        // Get Session
        getSession: async () => {
            try {
                const user = localStorage.getItem(USER_KEY);
                const token = localStorage.getItem(TOKEN_KEY);

                if (!token || !user) {
                    return {
                        data: { session: null },
                        error: null,
                    };
                }

                // Verify token is still valid by calling user endpoint
                const response = await this.request('/auth/user');

                return {
                    data: {
                        session: {
                            user: response.user,
                            access_token: token,
                        },
                    },
                    error: null,
                };
            } catch (error) {
                // Token invalid or expired
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                this.token = null;

                return {
                    data: { session: null },
                    error: null,
                };
            }
        },

        // Update User
        updateUser: async (updates) => {
            try {
                // Currently only supports password changes
                if (updates.password) {
                    // TODO: Add password update endpoint
                    console.log('Password update not yet implemented');
                }

                return {
                    data: { user: updates },
                    error: null,
                };
            } catch (error) {
                return {
                    data: null,
                    error: { message: error.message },
                };
            }
        },

        // Sign Out
        signOut: async () => {
            try {
                await this.request('/auth/logout', { method: 'POST' });

                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                this.token = null;

                return { error: null };
            } catch (error) {
                return { error: { message: error.message } };
            }
        },

        // Get Current User
        getUser: async () => {
            try {
                const response = await this.request('/auth/user');
                return {
                    data: { user: response.user },
                    error: null,
                };
            } catch (error) {
                return {
                    data: null,
                    error: { message: error.message },
                };
            }
        },
    };

    // ============================================
    // DATA METHODS
    // ============================================

    // Get all machines
    getMachines = async () => {
        try {
            const data = await this.request('/machines');
            return {
                data,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: { message: error.message },
            };
        }
    };

    // Get monthly report
    getMonthlyReport = async (machineId, bulan, tahun) => {
        try {
            const data = await this.request(
                `/report/monthly?machine_id=${machineId}&bulan=${bulan}&tahun=${tahun}`
            );
            return {
                data,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: { message: error.message },
            };
        }
    };

    // Get checklist items
    getItems = async () => {
        try {
            const data = await this.request('/items');
            return {
                data,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: { message: error.message },
            };
        }
    };

    // Submit checklist report
    submitLaporan = async (reportData) => {
        try {
            const data = await this.request('/submit', {
                method: 'POST',
                body: JSON.stringify(reportData),
            });
            return {
                data,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: { message: error.message },
            };
        }
    };

    // Health check
    healthCheck = async () => {
        try {
            const data = await this.request('/health');
            return {
                data,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: { message: error.message },
            };
        }
    };
}

// Export singleton instance
export const supabaseClient = new APIClient();
export const apiClient = supabaseClient;

