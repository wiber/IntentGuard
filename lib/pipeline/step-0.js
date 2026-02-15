/**
 * src/pipeline/step-0.ts — Raw Materials
 *
 * Gathers blog posts, git commits, and tracked documents
 * into a unified corpus for the trust-debt pipeline.
 *
 * INPUTS:  Git repo, blog content, tracked documents
 * OUTPUTS: step-0-raw-materials.json (unified corpus)
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
const ROOT = join(import.meta.dirname || __dirname, '..', '..');
/**
 * Gather git commits from the last 30 days.
 */
function gatherCommits(days = 30) {
    const docs = [];
    try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const log = execSync(`git log --since="${since}" --format="%H|%aI|%s|%b" --name-only`, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        const entries = log.split('\n\n').filter(Boolean);
        for (const entry of entries) {
            const lines = entry.split('\n');
            const header = lines[0];
            if (!header)
                continue;
            const parts = header.split('|');
            const hash = parts[0];
            const date = parts[1];
            const subject = parts[2];
            const body = parts.slice(3).join('|');
            const files = lines.slice(1).filter(Boolean);
            docs.push({
                id: `commit-${hash?.slice(0, 8)}`,
                type: 'commit',
                title: subject || '',
                content: `${subject}\n\n${body}\n\nFiles:\n${files.join('\n')}`,
                timestamp: date || new Date().toISOString(),
                metadata: { hash, filesChanged: files, filesCount: files.length },
            });
        }
    }
    catch {
        console.warn('[step-0] Git log failed — skipping commits');
    }
    return docs;
}
/**
 * Gather blog posts from content directory.
 */
function gatherBlogs() {
    const docs = [];
    const blogDirs = [
        join(ROOT, '..', 'thetadrivencoach', 'src', 'content', 'blog'),
        join(ROOT, 'content', 'blog'),
    ];
    for (const blogDir of blogDirs) {
        if (!existsSync(blogDir))
            continue;
        try {
            const files = readdirSync(blogDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
            for (const file of files) {
                const filePath = join(blogDir, file);
                const content = readFileSync(filePath, 'utf-8');
                const stat = statSync(filePath);
                // Extract frontmatter title
                const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
                const dateMatch = content.match(/^date:\s*["']?(.+?)["']?\s*$/m);
                docs.push({
                    id: `blog-${file.replace(/\.(mdx?|md)$/, '')}`,
                    type: 'blog',
                    title: titleMatch?.[1] || file,
                    content: content.slice(0, 5000), // First 5KB
                    timestamp: dateMatch?.[1] || stat.mtime.toISOString(),
                    metadata: { file, path: filePath, size: stat.size },
                });
            }
        }
        catch {
            // Skip unreadable directories
        }
    }
    return docs;
}
/**
 * Gather tracked documents (patent, business plan, MVP spec, etc.).
 */
function gatherDocuments() {
    const docs = [];
    // Check for trust-debt-settings.json
    const settingsPath = join(ROOT, 'trust-debt-settings.json');
    let trackedPaths = [];
    if (existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
            if (settings.documents?.tracked) {
                trackedPaths = Object.values(settings.documents.tracked)
                    .map(d => resolve(ROOT, d.path));
            }
        }
        catch { }
    }
    // Also check standard locations
    const standardPaths = [
        join(ROOT, 'docs'),
        join(ROOT, '..', 'thetadrivencoach', 'docs'),
    ];
    for (const dir of standardPaths) {
        if (!existsSync(dir))
            continue;
        try {
            const files = readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json'));
            for (const f of files) {
                trackedPaths.push(join(dir, f));
            }
        }
        catch { }
    }
    for (const docPath of trackedPaths) {
        if (!existsSync(docPath))
            continue;
        try {
            const content = readFileSync(docPath, 'utf-8');
            const stat = statSync(docPath);
            const name = docPath.split('/').pop() || 'unknown';
            docs.push({
                id: `doc-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
                type: 'document',
                title: name,
                content: content.slice(0, 10000),
                timestamp: stat.mtime.toISOString(),
                metadata: { path: docPath, size: stat.size },
            });
        }
        catch { }
    }
    return docs;
}
/**
 * Gather voice memo transcripts from attention corpus.
 */
function gatherVoiceMemos() {
    const docs = [];
    const memoDir = join(ROOT, 'data', 'attention-corpus');
    if (!existsSync(memoDir))
        return docs;
    try {
        const files = readdirSync(memoDir).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
            const lines = readFileSync(join(memoDir, file), 'utf-8').split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.transcript || entry.content) {
                        docs.push({
                            id: `memo-${entry.timestamp || Date.now()}`,
                            type: 'voice-memo',
                            title: entry.title || 'Voice Memo',
                            content: entry.transcript || entry.content,
                            timestamp: entry.timestamp || new Date().toISOString(),
                            metadata: { source: file, ...entry.metadata },
                        });
                    }
                }
                catch { }
            }
        }
    }
    catch { }
    return docs;
}
/**
 * Run step 0: gather all raw materials.
 */
export async function run(runDir, stepDir) {
    console.log('[step-0] Gathering raw materials...');
    const commits = gatherCommits(30);
    const blogs = gatherBlogs();
    const documents = gatherDocuments();
    const voiceMemos = gatherVoiceMemos();
    const allDocs = [...commits, ...blogs, ...documents, ...voiceMemos];
    const result = {
        step: 0,
        name: 'raw-materials',
        timestamp: new Date().toISOString(),
        documents: allDocs,
        stats: {
            commits: commits.length,
            blogs: blogs.length,
            documents: documents.length,
            voiceMemos: voiceMemos.length,
            totalBytes: allDocs.reduce((sum, d) => sum + d.content.length, 0),
        },
    };
    writeFileSync(join(stepDir, '0-raw-materials.json'), JSON.stringify(result, null, 2));
    console.log(`[step-0] Gathered ${allDocs.length} documents (${commits.length} commits, ${blogs.length} blogs, ${documents.length} docs, ${voiceMemos.length} memos)`);
}
//# sourceMappingURL=step-0.js.map