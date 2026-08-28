import json
import re

log_path = r'C:\Users\pablo\.gemini\antigravity\brain\84744937-f53f-462a-afdc-b093023ff531\.system_generated\logs\transcript_full.jsonl'
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in reversed(lines):
    try:
        data = json.loads(line)
        if data.get('type') == 'PLANNER_RESPONSE':
            for tool_call in data.get('tool_calls', []):
                if tool_call.get('name') == 'default_api:write_to_file' or tool_call.get('name') == 'default_api:replace_file_content':
                    pass
    except:
        pass
