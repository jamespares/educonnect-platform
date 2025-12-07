# Supabase MCP Setup Instructions

## Step 1: Get Your Supabase Project Reference

Your project reference can be found in your Supabase URL:
- Go to your Supabase dashboard
- Your URL looks like: `https://<project-ref>.supabase.co`
- The `<project-ref>` is what you need

Alternatively, you can extract it from your `SUPABASE_URL` environment variable:
- If your URL is `https://abcdefghijklmnop.supabase.co`
- Then your project-ref is `abcdefghijklmnop`

## Step 2: Generate a Personal Access Token (PAT)

1. Log in to your Supabase account
2. Navigate to **Settings** > **Access Tokens**
3. Click **Create New Token**
4. Give it a name like "Cursor MCP Server"
5. Copy the token (you won't see it again!)

## Step 3: Create the MCP Configuration File

1. Create or edit `.cursor/mcp.json` in your project root
2. Copy the contents from `.cursor-mcp-template.json`
3. Replace the placeholders:
   - `<your-project-ref>` → Your actual project reference
   - `<your-personal-access-token>` → Your PAT from Step 2

Example:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=abcdefghijklmnop"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Step 4: Verify Connection

1. Restart Cursor IDE
2. Go to **Settings** > **MCP**
3. You should see the Supabase MCP server listed with a green "active" status

## Usage

Once configured, you can use natural language commands in Cursor to interact with your Supabase database:
- "Show me the schema of the teachers table"
- "Query all pending teacher applications"
- "Create a new table for..."

## Notes

- The `--read-only` flag ensures the MCP server only reads data (safer)
- Remove `--read-only` if you want write access
- The MCP server will automatically install the latest version via `npx`
