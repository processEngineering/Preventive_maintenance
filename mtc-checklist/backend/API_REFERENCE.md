# Frontend API Client Reference

## Overview

The `supabaseClient` has been replaced with a custom API client that communicates with your Flask backend powered by MySQL.

**Location**: `src/supabase/supabase-client.js`

The client is still named `supabaseClient` for backward compatibility, but it now uses your local Flask API instead of Supabase.

---

## Authentication API

### Sign Up

Register a new user:

```javascript
const { data, error } = await supabaseClient.auth.signUp(
    email,      // string: user@example.com
    password,   // string: user's password
    fullName    // string: optional, defaults to email
);

if (error) {
    console.error("Signup failed:", error.message);
} else {
    console.log("User created:", data.user);
    // Token automatically stored in localStorage
}
```

### Sign In

Login with email and password:

```javascript
const { data, error } = await supabaseClient.auth.signInWithPassword(
    email,      // string
    password    // string
);

if (error) {
    console.error("Login failed:", error.message);
} else {
    console.log("Logged in as:", data.user.email);
    // Token automatically stored in localStorage
}
```

### Get Session

Check current user session:

```javascript
const { data, error } = await supabaseClient.auth.getSession();

if (data.session) {
    console.log("Current user:", data.session.user);
    console.log("Token:", data.session.access_token);
} else {
    console.log("No active session");
}
```

### Get User

Get current user details:

```javascript
const { data, error } = await supabaseClient.auth.getUser();

if (error) {
    console.error("Failed to get user:", error.message);
} else {
    console.log("User:", data.user);
    // Output: { id, email, full_name, role }
}
```

### Sign Out

Logout current user:

```javascript
const { error } = await supabaseClient.auth.signOut();

if (error) {
    console.error("Logout failed:", error.message);
} else {
    console.log("Logged out successfully");
    // Token removed from localStorage
}
```

---

## Data API

### Get All Machines

Fetch list of machines for dropdown:

```javascript
const { data, error } = await supabaseClient.getMachines();

if (error) {
    console.error("Failed to fetch machines:", error.message);
} else {
    // data is array of machine objects
    data.forEach(machine => {
        console.log(`${machine.merk_mesin} (${machine.serial_no})`);
    });
}
```

**Response Format**:
```javascript
[
    {
        id: "uuid",
        merk_mesin: "Machine Brand",
        serial_no: "SN12345",
        tonage: 50
    },
    // ... more machines
]
```

### Get Monthly Report

Fetch report for specific machine and month:

```javascript
const { data, error } = await supabaseClient.getMonthlyReport(
    machineId,  // string: machine UUID
    month,      // string: month name (e.g., "January")
    year        // string: year (e.g., "2024")
);

if (error) {
    console.error("Failed to fetch report:", error.message);
} else {
    console.log("Headers:", data.headers);
    console.log("Details:", data.details);
}
```

**Response Format**:
```javascript
{
    headers: [
        {
            id: "uuid",
            machine_id: "uuid",
            bulan: "January",
            tahun: "2024",
            tanggal_isi: "2024-01-15T10:30:00",
            clhmi_machine: {
                tonage: 50,
                serial_no: "SN12345",
                merk_mesin: "Brand Name"
            }
        }
    ],
    details: [
        {
            id: "uuid",
            clhmi_id: "header_id",
            item_id: "uuid",
            status: "OK",
            clhmi_items: {
                nama_pengecekan: "Check Name"
            }
        }
    ]
}
```

### Get Checklist Items

Fetch all checklist questions:

```javascript
const { data, error } = await supabaseClient.getItems();

if (error) {
    console.error("Failed to fetch items:", error.message);
} else {
    data.forEach(item => {
        console.log(`${item.urutan}. ${item.nama_pengecekan}`);
    });
}
```

**Response Format**:
```javascript
[
    {
        id: "uuid",
        urutan: "1",
        nama_pengecekan: "Check oil level",
        tipe: "text"
    },
    // ... more items
]
```

### Submit Laporan

Submit a completed checklist report (requires authentication):

```javascript
const { data, error } = await supabaseClient.submitLaporan({
    nama_pelaksana: "John Doe",
    mesin: "Machine 1",
    tanggal: "2024-01-15",
    // ... other report data
});

if (error) {
    console.error("Failed to submit:", error.message);
} else {
    console.log("Report submitted:", data.message);
}
```

---

## System API

### Health Check

Test server and database connection:

```javascript
const { data, error } = await supabaseClient.healthCheck();

if (error) {
    console.error("Server/Database issue:", error.message);
} else {
    console.log("Status:", data.status); // "ok" or "error"
    console.log(data.message);
}
```

---

## Error Handling

All API methods return an object with `data` and `error`:

```javascript
const { data, error } = await supabaseClient.apiMethod(...);

// Method 1: Check error
if (error) {
    console.error(error.message);
    // Handle error
} else {
    // Use data
}

// Method 2: Check data
if (!data) {
    // No data returned
}
```

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| "API request failed" | Server not running | Start Flask server |
| "Invalid token!" | Token expired or invalid | Re-login |
| "Token is missing!" | Not authenticated | Call auth.signUp/login first |
| "User already exists" | Email already registered | Use different email |
| "Invalid credentials" | Wrong email/password | Check credentials |

---

## Token Management

Tokens are automatically managed in `localStorage`:

```javascript
// Token is stored as 'auth_token'
localStorage.getItem('auth_token');

// User info stored as 'user_info'
localStorage.getItem('user_info');

// Manual logout (if needed)
localStorage.removeItem('auth_token');
localStorage.removeItem('user_info');
```

Tokens include:
- `user_id`: User's database ID
- `email`: User's email
- `exp`: Expiration timestamp

Default expiration: **24 hours** (configurable in `.env`)

---

## API Base URL

All requests go to:

```
http://localhost:5000/api
```

In production, update this in `supabase-client.js`:

```javascript
const API_URL = "https://your-production-server.com/api";
```

---

## Example: Complete Login Flow

```javascript
// 1. Sign up
const { data: signupData, error: signupError } = 
    await supabaseClient.auth.signUp(
        'user@example.com',
        'password123',
        'John Doe'
    );

if (signupError) {
    console.error("Signup failed:", signupError.message);
    return;
}

// 2. User is logged in (token stored automatically)
console.log("Logged in as:", signupData.user.email);

// 3. Get current session
const { data: sessionData } = 
    await supabaseClient.auth.getSession();

console.log("Active session:", !!sessionData.session);

// 4. Fetch machines (requires auth)
const { data: machines } = 
    await supabaseClient.getMachines();

// 5. Logout
await supabaseClient.auth.signOut();
```

---

## Backward Compatibility

Since the client is still named `supabaseClient`, existing frontend code doesn't need major changes:

**Old Supabase code**:
```javascript
const { data } = await supabaseClient.from('machines').select();
```

**New API code** (simpler):
```javascript
const { data } = await supabaseClient.getMachines();
```

But the method names and response formats are different, so you'll need to update method calls.

---

## For Developers

To add new API endpoints:

**Backend (server.py)**:
```python
@app.route('/api/new-endpoint', methods=['GET'])
@token_required  # If auth required
def new_endpoint():
    # Your logic here
    return jsonify(result), 200
```

**Frontend (supabase-client.js)**:
```javascript
newMethod = async (param) => {
    try {
        const data = await this.request('/new-endpoint?param=' + param);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
};
```

Then use:
```javascript
const { data, error } = await supabaseClient.newMethod(value);
```

---

## Tips

1. **Always check for errors** in your API calls
2. **Keep tokens secure** - don't expose in public code
3. **Use HTTPS in production** for token security
4. **Clear tokens** when users logout
5. **Test API endpoints** with tools like Postman first
6. **Add loading states** while API calls are in progress
