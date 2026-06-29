import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const APP_PATH = process.env.APP_PATH || '.';

// Helper to manually load .env file
function loadEnv() {
  const envPath = path.join(APP_PATH, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://zipiuxnvltsjwriwmmor.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Warning] SUPABASE_SERVICE_ROLE_KEY environment variable is not defined.');
  console.warn('Syncing to Supabase database will be skipped. Ensure it is set in production/GitHub Actions.');
}

async function translateToChinese(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    if (json && json[0]) {
      return json[0].map(item => item[0]).join('').trim();
    }
  } catch (e) {
    console.error(`[Warning] Translation failed for "${text}":`, e.message);
  }
  return text;
}

function parseCommitMessage(message) {
  const firstLine = message.split('\n')[0].trim();
  const match = firstLine.match(/^([a-z]+)(?:\([a-z0-9_-]+\))?:\s*(.*)$/i);
  if (match) {
    const type = match[1].toLowerCase();
    const content = match[2].trim();
    if (['feat'].includes(type)) return { type: 'feat', content };
    if (['fix'].includes(type)) return { type: 'fix', content };
    if (['style', 'perf', 'refactor'].includes(type)) return { type: 'style', content };
    return { type: 'other', content };
  }
  return { type: 'other', content: firstLine };
}

function getCommits() {
  const commits = [];
  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      if (eventData.commits && eventData.commits.length > 0) {
        for (const commit of eventData.commits) {
          if (commit.message.startsWith('Merge branch') || commit.message.startsWith('chore: sync changelog')) {
            continue;
          }
          commits.push(commit.message);
        }
      } else if (eventData.head_commit) {
        commits.push(eventData.head_commit.message);
      }
    } catch (err) {
      console.error('Failed to parse GITHUB_EVENT_PATH:', err);
    }
  }
  if (commits.length === 0) {
    try {
      const lastCommitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
      if (lastCommitMessage) {
        commits.push(lastCommitMessage);
      }
    } catch (err) {
      console.error('Failed to run git log:', err);
    }
  }
  return commits;
}

async function run() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Skipping sync: SUPABASE_SERVICE_ROLE_KEY is not defined.');
    return;
  }

  const commits = getCommits();
  if (commits.length === 0) {
    console.log('No commits found to process.');
    return;
  }

  console.log(`Processing commits:`, commits);

  // Read app version
  const appPackageJsonPath = path.join(APP_PATH, 'package.json');
  if (!fs.existsSync(appPackageJsonPath)) {
    console.error(`App package.json not found at: ${appPackageJsonPath}`);
    process.exit(1);
  }
  const appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf8'));
  const version = appPackageJson.version || '1.0.0';
  console.log(`Current App Version: ${version}`);

  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  // Fetch existing version row from Supabase
  let existingEntry = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/changelogs?version=eq.${version}&select=*`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        existingEntry = data[0];
      }
    } else {
      console.warn(`Failed to fetch existing logs (status: ${res.status}). Will attempt to insert as new.`);
    }
  } catch (err) {
    console.error('Failed to query existing changelogs from Supabase:', err);
  }

  const today = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');

  let changes = existingEntry ? existingEntry.changes : [];

  for (const rawMsg of commits) {
    const parsed = parseCommitMessage(rawMsg);
    console.log(`Translating: "${parsed.content}"`);
    const translatedContent = await translateToChinese(parsed.content);
    console.log(`Result: "${translatedContent}"`);

    // Check for duplicates
    const isDuplicate = changes.some(
      change => change.content === translatedContent && change.type === parsed.type
    );

    if (!isDuplicate) {
      changes.push({
        type: parsed.type,
        content: translatedContent
      });
    } else {
      console.log(`Skipping duplicate change: [${parsed.type}] ${translatedContent}`);
    }
  }

  // Prepare upsert body
  const payload = {
    version,
    date: existingEntry ? existingEntry.date : today,
    changes
  };

  // Perform Upsert to Supabase
  console.log('Upserting changelog to Supabase...', payload);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/changelogs`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates, on-conflict=version'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('Successfully synchronized changelog to Supabase database!');
    } else {
      const errMsg = await res.text();
      throw new Error(`HTTP ${res.status}: ${errMsg}`);
    }
  } catch (err) {
    console.error('Failed to upsert changelog to Supabase:', err);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Error running sync-changelog:', err);
  process.exit(1);
});
