(function () {
    function createQuery(table) {
        const state = {
            method: "GET",
            filters: [],
            options: {},
            body: undefined,
            cardinality: "many"
        };
        let request;

        const query = {
            select(columns = "*") {
                state.options.select = columns;
                return this;
            },
            insert(values) {
                state.method = "POST";
                state.body = values;
                return this;
            },
            update(values) {
                state.method = "PATCH";
                state.body = values;
                return this;
            },
            delete() {
                state.method = "DELETE";
                return this;
            },
            eq(column, value) {
                state.filters.push(["eq", column, value]);
                return this;
            },
            neq(column, value) {
                state.filters.push(["neq", column, value]);
                return this;
            },
            is(column, value) {
                state.filters.push(["is", column, value]);
                return this;
            },
            not(column, operator, value) {
                if (operator !== "is") throw new Error("Unsupported filter");
                state.filters.push(["neq", column, value]);
                return this;
            },
            ilike(column, value) {
                state.filters.push(["ilike", column, value]);
                return this;
            },
            order(column, options = {}) {
                state.options.order = `${column}.${options.ascending === false ? "desc" : "asc"}`;
                return this;
            },
            limit(count) {
                state.options.limit = count;
                return this;
            },
            single() {
                state.cardinality = "single";
                return this;
            },
            maybeSingle() {
                state.cardinality = "maybeSingle";
                return this;
            },
            then(resolve, reject) {
                if (!request) request = executeQuery(table, state);
                return request.then(resolve, reject);
            }
        };

        return query;
    }

    async function executeQuery(table, state) {
        const url = new URL(`/api/data/${encodeURIComponent(table)}`, window.location.origin);
        for (const [key, value] of Object.entries(state.options)) {
            url.searchParams.set(key, value);
        }
        for (const [operator, column, value] of state.filters) {
            url.searchParams.append(
                `${operator}[${column}]`,
                value === null ? "null" : String(value)
            );
        }

        try {
            const response = await fetch(url, {
                method: state.method,
                headers: {
                    ...(state.body === undefined ? {} : { "Content-Type": "application/json" }),
                    "ngrok-skip-browser-warning": "true"
                },
                credentials: "same-origin",
                body: state.body === undefined ? undefined : JSON.stringify(state.body)
            });
            const result = await response.json();
            if (!response.ok) {
                return {
                    data: null,
                    error: result.error || { message: "PostgreSQL request failed" }
                };
            }

            let data = result.data;
            if (state.cardinality === "single") {
                if (!Array.isArray(data) || data.length !== 1) {
                    return { data: null, error: { message: "Expected exactly one row" } };
                }
                data = data[0];
            } else if (state.cardinality === "maybeSingle") {
                if (!Array.isArray(data) || data.length > 1) {
                    return { data: null, error: { message: "Expected at most one row" } };
                }
                data = data[0] || null;
            }
            return { data, error: null };
        } catch (error) {
            return { data: null, error: { message: error.message } };
        }
    }

    window.mtcApiClient = {
        from(table) {
            return createQuery(table);
        },
        auth: {
            async getSession() {
                try {
                    const response = await fetch("/api/auth/me", {
                        credentials: "same-origin",
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    if (response.status === 401) {
                        return { data: { session: null }, error: null };
                    }
                    const result = await response.json();
                    if (!response.ok) {
                        return { data: { session: null }, error: { message: result.error } };
                    }
                    return {
                        data: { session: { user: { id: result.user.id } } },
                        error: null
                    };
                } catch (error) {
                    return { data: { session: null }, error: { message: error.message } };
                }
            }
        },
        storage: {
            from(bucket) {
                return {
                    async upload(key, file) {
                        try {
                            const response = await fetch(
                                `/api/storage/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": file.type || "application/octet-stream",
                                        "ngrok-skip-browser-warning": "true"
                                    },
                                    credentials: "same-origin",
                                    body: file
                                }
                            );
                            const result = await response.json();
                            return response.ok
                                ? { data: result.data, error: null }
                                : { data: null, error: result.error || { message: "Upload failed" } };
                        } catch (error) {
                            return { data: null, error: { message: error.message } };
                        }
                    },
                    getPublicUrl(key) {
                        return {
                            data: {
                                publicUrl: `/api/storage/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`
                            }
                        };
                    }
                };
            }
        }
    };
})();
